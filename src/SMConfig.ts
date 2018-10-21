import fs from 'fs'
import lodashCloneDeep from 'lodash/cloneDeep'
import lodashMerge from 'lodash/merge'
import SMHelper from 'smhelper'
import {GetEnvironment} from './GetEnvironment'
import {LoadConfigFile} from './LoadConfigFile'
import {ParseEnvVar} from './ParseEnvVar'
import {ConfigStore, Dictionary} from './SharedTypes'

/**
 * Type for the `config` argument of the SMConfig constructor
 */
export type SMConfigConfig = Array<Dictionary|string|SMConfig>|Dictionary|string|SMConfig

/**
 * Options for the SMConfig constructor
 */
export interface SMConfigOptions {
    /** Name of the environmental variable with options passed at runtime; default is `SMCONFIG` */
    envVarName?: string
}

/**
 * Environment and configuration utilities
 */
export class SMConfig {
    /** Holds the name of the environment, as determined during initialization */
    protected _environment: string

    /** Contains the configuration for the current environment */
    protected _config: Dictionary

    /**
     * Initializes the class, determining the environment, then
     * loading the configuration for the environment and storing it in the object.
     *
     * The **`config`** parameter can be an object with the configuration values,
     * or a string representing a JSON/YAML/Hjson file to load, another instance of
     * SMConfig, or an array mixing those.
     * If multiple objects/files are passed, values are merged from left to right,
     * so subsequent values overwrite property assignments of previous values.
     * File type is determined by the extension: json, yml, yaml, hjson.
     *
     * When using YAML files, you can also represent additional JavaScript
     * typtes that are not allowed by JSON and Hjson:
     * - RegExp: `!!js/regexp /pattern/gim`
     * - Functions: `!!js/function 'function () {...}'`
     * - Undefined: `!!js/undefined ''`
     *
     * The configuration object should have the following structure:
     *
     * ````js
     * {
     *     // Default configuration, for all environments
     *     default: {
     *         key1: 'value1',
     *         key2: 'value2'
     *     },
     *
     *     // Each subsequent key is the name of the environment;
     *     // this can be anything you want
     *     dev: {
     *         // Custom environments inherit all keys from the default
     *         // environment, but can be overwritten here
     *         key1: 'override',
     *         newkey: 'helloworld'
     *     },
     *     production: {
     *         key1: 'override'
     *     },
     *     otherenvironment: {},
     *
     *     // The hostnames object contains a list of hostnames that are
     *     // mapped to a specific environment.
     *     hostnames: {
     *         // Name of the environment, then list of hostnames
     *         dev: [
     *             'laptop.localdomain'
     *         ],
     *         production: [
     *             // Can use * as wildcard
     *             '*.example.com',
     *             // Can also use RegExp objects
     *             /(.*?)\.example\.com$/i
     *         ]
     *     }
     * }
     * ````
     *
     * Configuration values can always be overridden at runtime by passing
     * environmental variables to the application. All values can be specified
     * in a string with key-value pairs, in an environmental variable called
     * `SMCONFIG` (name can be changed with the **`options.envVarName`**
     * setting). You can also append `_1`, `_2`, etc, to pass multiple
     * environmental variables. Multiple key-value pairs can be passed in the
     * same variable, separated by a space. If the value contains a space,
     * quotes can be used to escape it.
     * It's possible to load environmental variables from a ".env" file by
     * specifying the file path in the `SMCONFIG_FILE`
     * (or `options.envVarName + '_FILE'`) variable. This can be used with
     * Docker secrets too, when the path is in `/run/secrets`.
     * Values passed via environmental variables are strings, but numeric ones
     * (those representing a number) are converted to numbers.
     *
     * Values in the hostnames array can be RegExp objects or strings. Strings are
     * parsed using `SMHelper.strIs`, so the `*` token can be used as wildcard.
     *
     * The environment is determined by, in order:
     *
     * 1. The value passed to the **`env`** parameter
     * 2. The `NODE_ENV` environmental variable
     * 3. The environment that is configured for the hostname
     * 4. Fallback to the `default` environment
     *
     * @param config - Configuration params or filename(s) to load
     * @param env - Force a specific environment
     * @param options - Dictionary with options
     */
    constructor(config: SMConfigConfig, env?: string, options?: SMConfigOptions) {
        // Ensure options is an object
        if (options && !SMHelper.isPlainObject(options)) {
            throw Error('The options parameter must be a dictionary')
        }
        else if (!options) {
            options = {}
        }

        // Defaults for the options parameter
        options = Object.assign({
            envVarName: 'SMCONFIG'
        }, options)

        // Ensure the config object is set
        if (!config) {
            throw Error('Parameter config must be set')
        }

        // Ensure that the config param is an array
        if (!Array.isArray(config)) {
            config = [config]
        }

        // Iterate through the config object and load all data
        const configData = {} as ConfigStore
        for (const i in config) {
            // String - represents a file to load
            if (typeof config[i] == 'string') {
                lodashMerge(configData, LoadConfigFile(config[i]))
            }
            // Another instance of SMConfig
            else if (config[i] instanceof SMConfig) {
                // In this case, merge the configuration into the default config object
                if (!configData.default) {
                    configData.default = {}
                }
                lodashMerge(configData.default, config[i].all)
            }
            // Plain object
            else if (SMHelper.isPlainObject(config[i])) {
                lodashMerge(configData, config[i])
            }
            else {
                throw Error('Parameter config must be a string, a plain object, or an array of the strings and objects')
            }
        }

        // Ensure configData contains the default configuration
        if (!configData.default || !SMHelper.isPlainObject(configData.default)) {
            throw Error('Cannot find default environment configuration in config parameter')
        }

        // Sanitize envVarName
        if (!options.envVarName) {
            throw Error('envVarName option must not be empty')
        }
        options.envVarName = SMHelper.toStringSafe(options.envVarName)

        // Get the name of the current environment
        this._environment = GetEnvironment(env, configData.hostnames)

        // Load environmental-specific configuration
        const envConfig = (configData[this.environment] && SMHelper.isPlainObject(configData[this.environment]))
            ? configData[this.environment]
            : {}

        // Lastly, load configuration from environmental variables
        let envVars = {} as Dictionary
        const matchExpression = new RegExp('^(' + options.envVarName + '|' + options.envVarName + '_[0-9]+)$')
        /* istanbul ignore else */
        if (process && process.env) {
            for (const key in process.env) {
                // Check if it's a filename with environments variables as content
                if (key == options.envVarName + '_FILE') {
                    // Read the file synchronously
                    if (!fs.existsSync(process.env[key])) {
                        throw Error('Cannot read file with environment variables: file doesn\'t exist')
                    }
                    const fileContent = fs.readFileSync(process.env[key], 'utf8')
                    if (!fileContent) {
                        throw Error('Cannot read file with environment variables: file is empty')
                    }
                    envVars = lodashMerge(envVars, ParseEnvVar(fileContent))
                }
                // Check if it's a string SMCONFIG or SMCONFIG_n
                else if (key.match(matchExpression)) {
                    envVars = lodashMerge(envVars, ParseEnvVar(process.env[key]))
                }
            }
        }

        // Merge all the configuration, in order of priority:
        // 1. Runtime environmental variables
        // 2. Environment config
        // 3. Default config
        // Store the result in the object
        this._config = lodashMerge({} as Dictionary, configData.default, envConfig, envVars)
    }

    /**
     * Environment name
     */
    get environment(): string {
        return this._environment
    }

    /**
     * All configuration parameters (read-only)
     */
    get all(): Dictionary {
        // Return a clone of the object so it can't be modified
        return lodashCloneDeep(this._config)
    }

    /**
     * Return value for key from configuration
     * @param key - Configuration key to retrieve
     * @return Value for the key
     */
    get(key: string): any {
        if (!key || typeof key != 'string') {
            throw Error('Parameter key must be a non-empty string')
        }

        let val

        // If key contains a dot, we are requesting a nested object
        if (key.indexOf('.') != -1) {
            const parts = key.split('.')
            val = this._config
            let i = 0
            while (val && i < parts.length) {
                val = val[parts[i]]
                i++
            }
        }
        else {
            val = this._config[key]
        }

        // Return a clone of the object so it can't be modified
        return lodashCloneDeep(val)
    }
}
module.exports = SMConfig
export default SMConfig
