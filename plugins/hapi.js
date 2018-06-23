'use strict'

const pkg = require('../package.json')
const SMConfig = require('../')

/**
 * Returns a Hapi plugin that includes a SMConfig instance.
 * 
 * This plugin is designed for Hapi 17+ only.
 */
module.exports = {
    name: pkg.name,
    version: pkg.version,

    /**
     * To register the Hapi plugin, pass an instance of SMConfig in the options object:
     * 
     * ````js
     * const conf = new SMConfig(config, env, options)
     * await server.register({
     *     plugin: require('smconfig/plugins/hapi'),
     *     options: {config: conf}
     * })
     * ````
     * 
     * @param {Object} server - The Hapi server object
     * @param {Object} options - Plugin options
     * @param {Object|string} options.config - An already-initialized instance of SMConfig
     */
    register: (server, options) => {
        // Ensure we have an instance of SMConfig
        if (!options || !options.config) {
            throw Error('options.config must be set')
        }
        if (!(options.config instanceof SMConfig)) {
            throw Error('options.config must be an instance of SMConfig')
        }

        // Decorate the Hapi server with the config object
        server.decorate('server', 'config', options.config)
        server.decorate('request', 'config', options.config)
    }
}
