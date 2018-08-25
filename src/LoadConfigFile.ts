import fs from 'fs'
import hjson from 'hjson'
import yaml from 'js-yaml'
import {ConfigStore} from './SharedTypes'

/**
 * Reads the content of a config file from disk and parses it.
 * Supported file types are JSON, YAML and Hjson.
 *
 * Note that this function is designed to read the files synchronously, as it's
 * meant to be executed only once at startup time.
 *
 * @param filename - Path of the file to load
 * @return Dictionary with the contents of the config file
 */
export function LoadConfigFile(filename: string): ConfigStore {
    // Check if file exists
    if (!fs.existsSync(filename)) {
        throw Error('Configuration file doesn\'t exist')
    }

    // Determine file type by extension
    const fileType = filename.split('.').pop().toLowerCase()

    let configData: ConfigStore
    if (fileType == 'json') {
        configData = JSON.parse(fs.readFileSync(filename, 'utf8'))
    }
    else if (fileType == 'yml' || fileType == 'yaml') {
        configData = yaml.load(fs.readFileSync(filename, 'utf8'))
    }
    else if (fileType == 'hjson') {
        configData = hjson.parse(fs.readFileSync(filename, 'utf8'))
    }
    else {
        throw Error('Invalid config file format')
    }

    return configData
}
