/**
 * Format for the objects used internally to store configuration
 */
export interface ConfigStore {
    /** Values for the default environment */
    default: Dictionary

    /** Map of hostnames */
    hostnames?: HostnamesMap

    /** Remaining keys are the configuration for each custom environment */
    [environment: string]: Dictionary
}

/**
 * Used internally to represent dictionaries, or key-value pairs where key is a string and value is anything.
 */
export interface Dictionary {
    [key: string]: any
}

/**
 * Object containing the hostname to environment map.
 * Each key is the name of the environment, with the value being an array of strings and RegExp's that map to the environment.
 */
export interface HostnamesMap {
    [environment: string]: Array<string|RegExp>
}
