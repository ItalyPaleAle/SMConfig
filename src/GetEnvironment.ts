import os from 'os'
import SMHelper from 'smhelper'
import {HostnamesMap} from './SharedTypes'

/**
 * Determines the environment to use.
 *
 * 1. The value of the `env` parameter
 * 2. The value of `process.env.NODE_ENV`
 * 3. Determine the environment by looking up the machine's hostname.
 *
 * The `hostnames` dictionary is a set of key-value pairs in which the key is the name
 * of the environment, and the value is an array of hostnames that are used for that
 * environment. Values can be strings (in which the * is used as glob for matching)
 * or regular expressions objects.
 *
 * @param env - If passed, this is the environment that will be used
 * @param hostnames - Dictionary in which each key is the environment name, and the value is an array of hostnames to match.
 * @return The environment to use
 */
export function GetEnvironment(env?: string, hostnames?: HostnamesMap): string {
    // 1. The value passed in the `env` parameter
    env = env ? SMHelper.toStringSafe(env) : null
    if (env) {
        return env
    }

    // 2. The NODE_ENV environmental variable
    if (process.env.NODE_ENV) {
        // Variables in process.env are always strings
        return process.env.NODE_ENV
    }

    // 3. The environment that is configured for the hostname
    if (hostnames) {
        const hostname = os.hostname()

        for (const e in hostnames) {
            /* istanbul ignore if */
            if (!hostnames.hasOwnProperty(e)) {
                continue
            }

            // Ensure the value is a non-empty array, or ignore this
            if (!hostnames[e] || !Array.isArray(hostnames[e]) || !hostnames[e].length) {
                continue
            }

            // Iterate through the list of hostnames
            for (const v of hostnames[e]) {
                if (!v) {
                    continue
                }

                if (typeof v == 'string') {
                    // Value is a string
                    if (SMHelper.strIs(v, hostname)) {
                        // Return the value from the function
                        return e
                    }
                }
                else if (v instanceof RegExp) {
                    // Value is a RegExp
                    if (v.test(hostname)) {
                        // Return the value from the function
                        return e
                    }
                }
                else {
                    // Ignore invalid values
                    continue
                }
            }
        }
    }

    // 4. Fallback to the default environment
    return 'default'
}
