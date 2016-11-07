# SMConfig

Application configuration module for Node.js.

Features:

- Simple APIs, using ES6 classes
- Supports multiple environments
- Automatic environment detection based on hostname
- Override configuration at runtime with environmental variables
- Supports loading configuration from JSON, YAML and [Hjson](http://hjson.org) documents

This code is licensed under the terms of the BSD (2-clause) license (see LICENSE.md).

## Add to your project

Install from NPM:

````sh
npm install --save smconfig
````

## API Guide

Include the module with:

````js
const SMConfig = require('smconfig')
````

The module exports a class named `SMConfig`.

### Constructor: SMConfig(config, env, envVarPrefix)

````js
let config = new SMConfig(config, env, envVarPrefix)
````

The constructor determines the environment, then loads the configuration for the environment and stores it in the object.

The environment is determined by, in order:

1. The value passed to the **`env`** parameter
2. The `process.env.NODE_ENV` environmental variable (when launching the application; for example: `$ NODE_ENV=production node myapp.js`)
3. The environment that is configured for the hostname (see below)
4. Fallback to the `default` environment

The **`config`** paramter can either be a JavaScript object or the filename (as string) of a JSON, YAML or Hjson file. The file type is determined by the extension, and supported ones are: `*.json`, `*.yaml`, `*.yml` and `*.hjson`.

The configuration object must have the following basic structure:

````js
let config = {
    // Default configuration, for all environments
    default: {
        key1: 'value1',
        key2: 'value2'
    },

    // Each subsequent key is the name of the environment;
    // this can be anything you want
    dev: {
        // Custom environments inherit all keys from the default
        // environment, but can be overwritten here
        key1: 'override',
        newkey: 'helloworld'
    },
    production: {
        key1: 'override'
    },
    otherenvironment: {},

    // The hostnames object contains a list of hostnames that are
    // mapped to a specific environment.
    hostnames: {
        // Name of the environment, then list of hostnames
        dev: [
            'alessandro.localdomain'
        ],
        production: [
            // Can use * as wildcard
            '*.example.com',
            // Can also use RegExp objects
            /(.*?)\.example\.com$/i
        ]
    }
}
````

For sample configuration files in JSON, YAML and Hjson, check the documents in the test folder:

- [Sample JSON configuration](test/resources/testconfig.json)
- [Sample YAML configuration](test/resources/testconfig.yaml)
- [Sample Hjson configuration](test/resources/testconfig.hjson)

When using YAML, you can also use the following types that are not supported by JSON and Hjson: (see documentation for [js-yaml](https://github.com/nodeca/js-yaml) for more information)

- RegExp: `!!js/regexp /pattern/gim`
- Functions: `!!js/function 'function () {...}'`
- Undefined: `!!js/undefined ''`

Configuration can also be passed at runtime (and it can override what is defined in the application or in the config files) with environmental variables. These values are prefixed with **`envVarPrefix`**, which defaults to `APPSETTING_`; the prefix is then removed, the key is lowercased and converted to camelCase. For example:

````sh
# SMConfig will store 'Passw0rd' for the 'databaseConfiguration' key
$ APPSETTING_DATABASE_PASSWORD=Passw0rd node myapp.js

# You can use a custom prefix by changing envVarPrefix,
# for example to CUSTOMPREFIX_
$ CUSTOMPREFIX_DATABASE_PASSWORD=Passw0rd node myapp.js
````

### SMConfig.get(key)

````js
// config is an instance of SMConfig
let databasePassword = config.get('databasePassword')
````

Returns the value for the key passed as argument, reading from the configuration for the environment.

### SMConfig.environment

````js
// config is an instance of SMConfig
let env = config.environment
````

The **`environment`** property, which is read-only, contains the name of the environment being used by the application.

### SMConfig.all

````js
// config is an instance of SMConfig
let allConfiguration = config.all
````

The **`all`** property, which is read-only, contains all the configuration variables for the current environment.
