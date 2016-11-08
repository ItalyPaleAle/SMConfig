# SMConfig

## v0.2.1 - 2016-11-08

**Fixes**

- When environments override the default configuration, dictionaries are merged recursively.

## v0.2.0 - 2016-11-07

**New features**

- This release adds support for "flattening" of the configuration data, allowing nested dictionaries to be accessed also using the "dot notation". This allows for using the `get` method to retrieve nested properties, such as in `config.get('database.credentials.password')`. This can be turned off with `options.flatten: false`.
- Full documentation published using JSDoc, in the `docs` folder.

**Breaking changes**

- In the constructor method for `SMConfig`, the third parameter `envVarPrefix` has been replaced with a dictionary named `options`. `envVarPrefix` is now a key inside the options dictionary.

**Fixes**

- The `get` method now throws an exception if the key parameter is not a string.
- Fixes in the test suite and improved test coverage, now to 100%.
- Improved text inside JSDoc comment blocks.

## v0.1.0 - 2016-11-06

First release as independent module.
