# SMConfig v2.1

[![Build Status](https://dev.azure.com/italypaleale/italypaleale/_apis/build/status/ItalyPaleAle.SMConfig?branchName=master)](https://dev.azure.com/italypaleale/italypaleale/_build/latest?definitionId=18&branchName=master)
[![Coverage Status](https://coveralls.io/repos/github/ItalyPaleAle/SMConfig/badge.svg?branch=master)](https://coveralls.io/github/ItalyPaleAle/SMConfig?branch=master)
[![Dependency Status](https://david-dm.org/ItalyPaleAle/SMConfig.svg?style=flat)](https://david-dm.org/ItalyPaleAle/SMConfig)
[![devDependency Status](https://david-dm.org/ItalyPaleAle/SMConfig/dev-status.svg?style=flat)](https://david-dm.org/ItalyPaleAle/SMConfig#info=devDependencies)

Application configuration module for Node.js.

Features:

- Simple, yet flexible APIs
- Automatic environment detection based on hostname
- Override configuration at runtime with environmental variables or ".env" files
- Load configuration from JSON, YAML and [Hjson](http://hjson.org) documents
- Optional plugin for Hapi 17+

This module is written in TypeScript and transpiled to JavaScript. All typings are available alongside the code.

This code is licensed under the terms of the MIT license (see LICENSE.md).

## Full documentation

Full documentation is available on [GitHub pages](https://italypaleale.github.io/SMConfig/).

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

### Constructor: SMConfig(config, env, options)

````js
const conf = new SMConfig(config, env, options)
````

#### Parameters

- `config`: configuration object (read below for description)
- `env`: when set, forces a specific environment
- `options`: dictionary with options:
  - `options.envVarName`: name of the environmental variable where options are passed (default: `SMCONFIG`)

The constructor determines the environment, then loads the configuration for the environment and stores it in the object.

#### Config data

The **`config`** paramter can be:

- A plain JavaScript object, respecting the structure in the example below.
- The filename (as string) of a JSON, YAML or Hjson file. File type is determined by the extension, and supported ones are: `*.json`, `*.yaml`, `*.yml` and `*.hjson`. The content of the file must represent a structure like the one below.
- Another instance of SMConfig. In this case, the constructor will merge the content of `config.all` from the other object into the "default" section.
- An array mixing any of the above. In this case, data will be merged from left to right: subsequent values overwrite property assignments of previous values.

#### Config object structure

The config object must have the following basic structure:

- The `default` key is always required, containing the default config values for all the environments.
- The `hostnames` key can be defined. This is a dictionary in which the key is the environment name, and the value is an array of possible hostnames to match (exact string matches, strings with wildcard matching using `*`, or regular expressions).
- Any other key represents the configuration for the environment named like the key. For example, you can define the configuration for the "production" environment in the `production` key, and that will inherit from the `default` configuration all values not specified.

For example:

````js
const configData = {
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

    // The hostnames object contains a dictionary of hostnames that are
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

// Example:
const conf = new SMConfig(configData)
````

#### Load config data from files

In place of a config object, you can pass a string with the path of a file to load with the config object.

````js
// Load a file
const obj = new SMConfig('config.json')

// Load multiple files
const obj = new SMConfig(['config.json', 'config2.yaml'])
````

For sample configuration files in JSON, YAML and Hjson, check the documents in the test folder:

- [Sample JSON configuration](test/resources/testconfig.json)
- [Sample YAML configuration](test/resources/testconfig.yaml)
- [Sample Hjson configuration](test/resources/testconfig.hjson)

When using YAML, you can also use the following types that are not supported by JSON and Hjson: (see documentation for [js-yaml](https://github.com/nodeca/js-yaml) for more information)

- RegExp: `!!js/regexp /pattern/gim`
- Functions: `!!js/function 'function () {...}'`
- Undefined: `!!js/undefined ''`

#### Using environmental variables

Configuration can also be passed at runtime (and it can override what is defined in the application or in the config files) with an environmental variable. The variable `SMCONFIG` (name can be changed with **`options.envVarName`**) can contain a set of key-values. You can also append `_1`, `_2`, etc, to pass multiple environmental variables. For example:

````sh
# SMConfig will store 'Passw0rd' for the 'databasePassword' key
SMCONFIG="databasePassword=Passw0rd" \
  node myapp.js

# Nested properties can be passed too, for example `database.password`
SMCONFIG="database.password=Passw0rd" \
  node myapp.js

# Multiple values can be passed
SMCONFIG="database.password=Passw0rd database.username=admin" \
  node myapp.js

# You can add multiple environmental variable by appending `_#`
SMCONFIG="passphrase='hello world'" \
  SMCONFIG_1="hello=world" \
  SMCONFIG_2="a=b" \
  node myapp.js

# If the value contains a space, quote it
SMCONFIG_1="passphrase='hello world'" \
  SMCONFIG_2="secret=\"psshhh\"" \
  node myapp.js
````

You can also use the `SMCONFIG_FILE` (or `options.envVarName + '_FILE'`) to load a file with a list of values expressed as environmental variables. This is the same format of ".env" files, and can be used with **Docker secrets** as well.

A ".env" file has a list of config values expressed as `key=value`, separated by spacing characters (e.g. spaces or newlines). You can use single or double quotes to escape characters. Comments are not supported

Example of a ".env" file:

````text
hello=world
quotes="required when using spaces"
escape='it\'s my life'
nested.value="updated value in a nested object"
````

Example of loading the file:

````sh
# Loading the .env file
SMCONFIG_FILE="path/to/.env" \
  node myapp.js

# This can be used with Docker secrets too
SMCONFIG_FILE="/run/secrets/env" \
  node myapp.js
````

#### Environment

The environment is determined by, in order:

1. The value passed to the **`env`** parameter
2. The `process.env.NODE_ENV` environmental variable (when launching the application; for example: `$ NODE_ENV=production node myapp.js`)
3. The environment that is configured for the hostname (see below)
4. Fallback to the `default` environment

### SMConfig.get(key)

````js
// config is an instance of SMConfig
const databasePassword = config.get('databasePassword')

// You can access nested properties using the "dot notation"
const nested = config.get('database.credentials.password')
````

Returns the value for the key passed as argument, reading from the configuration for the environment.

### SMConfig.environment

````js
// config is an instance of SMConfig
const env = config.environment
````

The **`environment`** property, which is read-only, contains the name of the environment being used by the application.

### SMConfig.all

````js
// config is an instance of SMConfig
const allConfiguration = config.all
````

The **`all`** property, which is read-only, contains all the configuration variables for the current environment.

## Hapi plugin

This module offers an optional plugin for [Hapi](https://hapijs.com/) (version 17 or higher required).

To use it, initialize the SMConfig object as normal, then register the plugin with Hapi passing the instance of SMConfig.

Example:

````js
const SMConfig = require('smconfig')
const conf = new SMConfig(config, env, options)

await server.register({
    plugin: require('smconfig/plugins/hapi'),
    options: {config: conf}
})
````
