'use strict';

const os = require('os')
const fs = require('fs')
const yaml = require('js-yaml')
const hjson = require('hjson')
const SMHelper = require('smhelper')

/**
 * Environment and configuration utilities
 */
class SMConfig {
	/**
	 * Constructor method - initialize the class.
	 * Determines the environment, then sets the appropriate configuration.
	 * 
	 * The `config` parameter can be an object with the configuration values,
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
	 *   default: (Default configuration, for all environments)
	 *     <key1>: <value1>
	 * 	   <key2>: <value2>
	 *     ...
	 *   
	 *   <environment1>: (Configuration for a specific environment - optional)
	 *     <key1>: <newValue> (Overrides <key1>)
	 *     <anotherKey>: <anotherValue>
	 *     ...
	 *   
	 *   <environment2>: (Another environment)
	 *   
	 *   hostnames: (Hostnames to environment matches - optional)
	 *     <environment1>: (Array of strings or RegExp's)
	 * 	     - "<string1>"
	 *       - /<regexp1>/
	 *       ...
	 *     <environment2>:
	 *       - "<string2>"
	 *       ...
	 *     ...
	 * 
	 * Environmental configuration values can always be overridden at runtime by
	 * passing environmental variables to the application. To be considered,
	 * environmental variables must start with a prefix, configured with the
	 * `envVarPrefix` parameter (default: `APPSETTING_`) Environmental variables
	 * are lowercased then converted to camelCase, for example
	 * `APPSETTING_SECRET_KEY` becomes `secretKey`.
	 * Values passed via environmental variables are strings, but numeric ones
	 * (those representing a number) are converted to numbers.
	 * 
	 * Values in the hostnames array can be RegExp's or strings. Strings are
	 * parsed using SMHelper.strIs, so the '*' token can be used as wildcard.
	 * 
	 * The environment is determined by, in order:
	 * 1. The value passed in the `env` parameter
	 * 2. The `NODE_ENV` environmental variable
	 * 3. The environment that is configured for the hostname
	 * 4. Fallback to the `default` environment
	 * 
	 * @param {Object|string} config - Configuration params or filename to load
	 * @param {string} [env] - Optional set environment
	 * @param {string} [envVarPrefix] - Prefix for environmental variables (default: `APPSETTING_`)
	 */
	constructor(config, env, envVarPrefix) {
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
		envVarPrefix = envVarPrefix ? SMHelper.toStringSafe(envVarPrefix) : 'APPSETTING_'

		// Get the name of the current environment
		this._environment = this._getEnvironment(env, configData.hostnames)

		// Load environmental-specific configuration
		let envConfig = (configData[this.environment] && SMHelper.isPlainObject(configData[this.environment]))
			? configData[this.environment]
			: {}

		// Lastly, load configuration from environmental variables
		let envVars = this._loadEnvironmentalVariables(envVarPrefix)

		// Merge all the configuration, in order of priority:
		// 1. Runtime environmental variables
		// 2. Environment config
		// 3. Default config
		this._config = Object.assign({}, configData.default, envConfig, envVars) 
	}

	/**
	 * Environment name
	 */
	get environment() {
		return this._environment
	}

	/**
	 * All configuration parameters (read-only)
	 */
	get all() {
		return this._config
	}

	/**
	 * Return value for key from configuration
	 */
	get(key) {
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
				if(!hostnames.hasOwnProperty(e)) {
					continue
				}

				// Ensure the value is a non-empty array
				if(!hostnames[e] || !Array.isArray(hostnames[e])) {
					continue
				}

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

		// 4. Fallback to the default environment
		return 'default'
	}

	// Load additional configuration from environmental variables
	_loadEnvironmentalVariables(envVarPrefix) {
		let result = {}

		// Loop through environmental variables that can override configuration
		for(let key in process.env) {
			if(!process.env.hasOwnProperty(key)) {
				continue
			}

			// String.startsWith is available only in Node 6+
			if(key.substr(0, envVarPrefix.length) === envVarPrefix) {
				// Convert the key to the right format
				let keyCamelCase = SMHelper.stringToCamel(key.substr(envVarPrefix.length).toLowerCase())
				let value = process.env[key]

				// Check if value is a numeric string, then convert to number (float)
				if(SMHelper.isNumeric(value)) {
					value = parseFloat(value)
				}

				result[keyCamelCase] = value
			}
		}

		return result
	}
}

module.exports = SMConfig
