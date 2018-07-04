'use strict'

const lodashMerge = require('lodash.merge')
const SMHelper = require('smhelper')
const fs = require('fs')

const parseEnvVar = require('./lib/parseEnvVar')
const loadConfigFile = require('./lib/loadConfigFile')
const getEnvironment = require('./lib/getEnvironment')

/**
 * Environment and configuration utilities
 */
class SMConfig {
    /**
     * Initializes the class, determining the environment, then
     * loading the configuration for the environment and storing it in the object.
     *
     * The **`config`** parameter can be an object with the configuration values,
     * or a string representing a JSON/YAML/Hjson file to load. It is also possible
     * to pass an array of filenames to load, which will be read in the sequence they
     * are passed. File type is determined by the extension: json, yml, yaml, hjson
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
     * When **`options.flatten`** is true, as per default value, the configuration
     * data is also "flattened" into a dictionary that uses "dot notation". This
     * is done with `SMHelper.objectToDotNotation`. By "flattening" the dictionary,
     * it's possible to use the `get()` method to retrieve nested properties, such
     * as in `config.get('database.credentials.password')`.
     * 
     * @param {Object|string|string[]} config - Configuration params or filename(s) to load
     * @param {string} [env=default] - Force a specific environment
     * @param {object} [options] - Advanced options dictionary
     * @param {string} [options.envVarName=SMCONFIG] - Name of the environmental
     *        variable with options passed at runtime.
     * @param {boolean} [options.flatten=true] - When true, configuration object is
     * also flatened to "dot notation"
     */
    constructor(config, env, options) {
        // Ensure options is an object
        if (options && !SMHelper.isPlainObject(options)) {
            throw Error('The options parameter must be a dictionary')
        }
        else if (!options) {
            options = {}
        }

        // Defaults for the options parameter
        options = Object.assign({
            envVarName: 'SMCONFIG',
            flatten: true
        }, options)

        // Ensure the config object is set
        if (!config) {
            throw Error('Parameter config must be set')
        }

        // If config is a string or array of strings, load the file(s); otherwise,
        // config is an object that already contains the configuration
        let configData = {}
        // Single file to load
        if (typeof config == 'string') {
            configData = loadConfigFile(config)
        }
        // Array of files
        else if (Array.isArray(config)) {
            for (const i in config) {
                if (typeof config[i] != 'string') {
                    throw Error('Parameter config must be a string, an array of strings or a plain object')
                }
                configData = lodashMerge(configData, loadConfigFile(config[i]))
            }
        }
        // Plain object
        else if (SMHelper.isPlainObject(config)) {
            configData = config
        }
        else {
            throw Error('Parameter config must be a string, an array of strings or a plain object')
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
        this._environment = getEnvironment(env, configData.hostnames)

        // Load environmental-specific configuration
        const envConfig = (configData[this.environment] && SMHelper.isPlainObject(configData[this.environment]))
            ? configData[this.environment]
            : {}

        // Lastly, load configuration from environmental variables
        let envVars = {}
        const matchExpression = new RegExp('^(' + options.envVarName + '|' + options.envVarName + '_[0-9]+)$')
        /* istanbul ignore else */
        if (process.env) {
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
                    envVars = lodashMerge(envVars, parseEnvVar(fileContent))
                }
                // Check if it's a string SMCONFIG or SMCONFIG_n
                else if (key.match(matchExpression)) {
                    envVars = lodashMerge(envVars, parseEnvVar(process.env[key]))
                }
            }
        }

        // Merge all the configuration, in order of priority:
        // 1. Runtime environmental variables
        // 2. Environment config
        // 3. Default config
        // Store the result in the object
        this._config = lodashMerge({}, configData.default, envConfig, envVars)

        // Flatten all nested objects to dot notation, if necessary
        if (options.flatten) {
            const flat = SMHelper.objectToDotNotation(this._config, true)

            // Store in the object a merged dictionary, flattened and unflattened
            this._config = lodashMerge({}, flat, this._config)
        }
    }

    /**
     * Environment name
     * @type {string}
     */
    get environment() {
        return this._environment
    }

    /**
     * All configuration parameters (read-only)
     * @type {Object}
     */
    get all() {
        return this._config
    }

    /**
     * Return value for key from configuration
     * @param {string} key - Configuration key to retrieve
     * @return {*} Value for the key
     */
    get(key) {
        if (!key || typeof key != 'string') {
            throw Error('Parameter key must be a non-empty string')
        }
        return this._config[key]
    }
}

module.exports = SMConfig
