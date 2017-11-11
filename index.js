'use strict';

const os = require('os')
const fs = require('fs')
const yaml = require('js-yaml')
const hjson = require('hjson')
const lodashMerge = require('lodash.merge')
const SMHelper = require('smhelper')

/**
 * Environment and configuration utilities
 */
class SMConfig {
    /**
     * Initializes the class, determining the environment, then
     * loading the configuration for the environment and storing it in the object.
     *
     * The environment is determined by, in order:
     * 1. The value passed to the **`env`** parameter
     * 2. The `NODE_ENV` environmental variable
     * 3. The environment that is configured for the hostname
     * 4. Fallback to the `default` environment
     *
     * The **`config`** parameter can be an object with the configuration values,
     * or a string representing a JSON/YAML/Hjson file to load. File type is
     * determined by the extension: *.json, *.yml/*.yaml, *.hjson
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
     * environmental variables to the application. To be considered, environmental
     * variables must start with a prefix, configured with the
     * **`options.envVarPrefix`** setting (default: `APPSETTING_`) Environmental
     * variables are lowercased then converted to camelCase, for example
     * `APPSETTING_SECRET_KEY` becomes `secretKey`. The double underscore can be used
     * to pass nested options, so `APPSETTING_DB__PASSWORD` becomes `db.password`.
     * Values passed via environmental variables are strings, but numeric ones
     * (those representing a number) are converted to numbers.
     *
     * Values in the hostnames array can be RegExp objects or strings. Strings are
     * parsed using `SMHelper.strIs`, so the `*` token can be used as wildcard.
     *
     * When **`options.flatten`** is true, as per default value, the configuration
     * data is also "flattened" into a dictionary that uses "dot notation". This
     * is done with `SMHelper.objectToDotNotation`. By "flattening" the dictionary,
     * it's possible to use the `get()` method to retrieve nested properties, such
     * as in `config.get('database.credentials.password')`.
     * 
     * @param {Object|string} config - Configuration params or filename to load
     * @param {string} [env=default] - Force a specific environment
     * @param {object} [options] - Advanced options dictionary
     * @param {string} [options.envVarPrefix=APPSETTING_] - Prefix for Environmental
     * variables
     * @param {boolean} [options.flatten=true] - When true, configuration object is
     * also flatened to "dot notation"
     */
    constructor(config, env, options) {
        // Ensure options is an object
        if(options && !SMHelper.isPlainObject(options)) {
            throw Error('The options parameter must be a dictionary')
        }
        else if(!options) {
            options = {}
        }

        // Defaults for the options parameter
        options = Object.assign({
            envVarPrefix: 'APPSETTING_',
            flatten: true
        }, options)

        // Ensure the config object is set
        if(!config) {
            throw Error('Parameter config must be set')
        }
        if(typeof config != 'string' && !SMHelper.isPlainObject(config)) {
            throw Error('Parameter config must be a string or an object')
        }

        // If config is a string, load the file; otherwise, config is an object
        // that already contains the configuration
        let configData = (typeof config == 'string')
            ? this._loadConfigFile(config)
            : config

        // Ensure configData contains the default configuration
        if(!configData.default || !SMHelper.isPlainObject(configData.default)) {
            throw Error('Cannot find default environment configuration in config parameter')
        }

        // Default value for envVarPrefix
        options.envVarPrefix = options.envVarPrefix
            ? SMHelper.toStringSafe(options.envVarPrefix)
            : 'APPSETTING_'

        // Get the name of the current environment
        this._environment = this._getEnvironment(env, configData.hostnames)

        // Load environmental-specific configuration
        let envConfig = (configData[this.environment] && SMHelper.isPlainObject(configData[this.environment]))
            ? configData[this.environment]
            : {}

        // Lastly, load configuration from environmental variables
        let envVars = this._loadEnvironmentalVariables(options.envVarPrefix)

        // Merge all the configuration, in order of priority:
        // 1. Runtime environmental variables
        // 2. Environment config
        // 3. Default config
        // Store the result in the object
        this._config = lodashMerge({}, configData.default, envConfig, envVars)

        // Flatten all nested objects to dot notation, if necessary
        if(options.flatten) {
            let flat = SMHelper.objectToDotNotation(this._config, true)

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
        if(!key || typeof key != 'string') {
            throw Error('Parameter key must be a non-empty string')
        }
        return this._config[key]
    }

    /* !Private methods */

    // Load config data from file
    _loadConfigFile(filename) {
        // Check if file exists
        if(!fs.existsSync(filename)) {
            throw Error('Configuration file doesn\'t exist')
        }

        // Determine file type by extension
        let fileType = filename.split('.').pop().toLowerCase()

        let configData
        if(fileType == 'json') {
            configData = JSON.parse(fs.readFileSync(filename, 'utf8'))
        }
        else if(fileType == 'yml' || fileType == 'yaml') {
            configData = yaml.load(fs.readFileSync(filename, 'utf8'))
        }
        else if(fileType == 'hjson') {
            configData = hjson.parse(fs.readFileSync(filename, 'utf8'))
        }
        else {
            throw Error('Invalid config file format')
        }

        return configData
    }

    // Get the current environment
    _getEnvironment(env, hostnames) {
        // 1. The value passed in the `env` parameter
        if(env) {
            // Ensure env is a string
            env = SMHelper.toStringSafe(env)
            if(env) {
                return env
            }
        }

        // 2. The NODE_ENV environmental variable
        if(process.env.NODE_ENV) {
            // Variables in process.env are always strings
            return process.env.NODE_ENV
        }

        // 3. The environment that is configured for the hostname
        if(hostnames) {
            let hostname = os.hostname()

            for(let e in hostnames) {
                // Ensure the value is a non-empty array
                if(hostnames.hasOwnProperty(e) && hostnames[e] && Array.isArray(hostnames[e])) {
                    // Iterate through the list of hostnames
                    for(let i in hostnames[e]) {
                        let v = hostnames[e][i]
                        if(!v) {
                            continue
                        }

                        if(typeof v == 'string') {
                            // Value is a string
                            if(SMHelper.strIs(v, hostname)) {
                                // Return the value from the function
                                return e
                            }
                        }
                        else if(v instanceof RegExp) {
                            // Value is a RegExp
                            if(v.test(hostname)) {
                                // Return the value from the function
                                return e
                            }
                        }
                    }
                }
            }
        }

        // 4. Fallback to the default environment
        return 'default'
    }

    // Load additional configuration from environmental variables
    _loadEnvironmentalVariables(envVarPrefix) {
        let result = {}

        // Loop through environmental variables that can override configuration
        for(let key in process.env) {
            if(process.env.hasOwnProperty(key)) {
                // String.startsWith is available only in Node 6+
                if(key.substr(0, envVarPrefix.length) === envVarPrefix) {
                    // The double underscore can be used to get to nested objects
                    // Then convert the key to camelCase
                    let updateKey = key
                        .substr(envVarPrefix.length)
                        .split('__')
                        .map((str) => {
                            return SMHelper.stringToCamel(str.toLowerCase())
                        })
                        .join('.')

                    // Check if value is a numeric string, then convert to number (float)
                    let value = process.env[key]
                    if(SMHelper.isNumeric(value)) {
                        value = parseFloat(value)
                    }

                    // Update the nested object
                    SMHelper.updatePropertyInObject(result, updateKey, value)
                }
            }
        }

        return result
    }
}

module.exports = SMConfig
