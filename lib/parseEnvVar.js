'use strict'

/**
 * @module parseEnvVar
 */

const SMHelper = require('smhelper')

/**
 * Load additional configuration from environmental variables.
 * Pass the content of an environmental variable to the function, and it will
 * parse it by extracting all key-value pairs in the form key=value.
 * If necessary, single and/or double quotes can be used to escape the key or
 * the value.
 * Nested properties can be set using the "dot notation", as in `obj.a`.
 * 
 * @param {string} str - Content of the environmental variable to parse
 * @return {Object} Dictionary with the configuration parsed.
 */
function parseEnvVar(str) {
    // Function used to parse numeric values
    const parseToken = (token) => {
        // Check if value is a numeric string, then convert to number (float)
        if (SMHelper.isNumeric(token)) {
            token = parseFloat(token)
        }

        return token
    }

    // Returns true if the character is a spacing one
    // Grabbed from \s from regular expressions
    // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
    const spacingChars = [' ', '\f', '\n', '\r', '\t', '\v', '\u00a0', '\u1680', '\u2000-', '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\ufeff']
    const isSpacing = (char) => {
        return spacingChars.includes(char)
    }

    // Parse the string passed as environmental variable
    const result = {}
    let mode = 0 // 0 = key, 1 = value, &2 = single quote, &4 = double quote
    let token = ''
    let key = ''
    for (let i = 0; i < str.length; i++) {
        // Check if there's an escape character (\), which escapes: \ ' "
        if (str[i] == '\\' && i < str.length) {
            // If we're in a code block, we can only escape the delimeter and \
            const escapeable = ['\\']
            if (!(mode & 4)) {
                escapeable.push('\'')
            }
            if (!(mode & 2)) {
                escapeable.push('"')
            }

            if (escapeable.includes(str[i + 1])) {
                // Add the following character and advance i automatically
                token += str[i + 1]
                i++
            }
            else {
                // The \ character was not used for escaping
                token += str[i]
            }
        }
        // Check if we're getting into a quoted string
        // If so, then just add the character
        else if (mode & 2 || mode & 4) {
            // Exit the quote
            if (mode & 2 && str[i] == '\'') {
                mode -= 2
            }
            else if (mode & 4 && str[i] == '"') {
                mode -= 4
            }
            else {
                token += str[i]
            }
        }
        // Enter into a quoted string
        else if (str[i] == '\'') {
            mode += 2
        }
        else if (str[i] == '"') {
            mode += 4
        }
        // When we are parsing the key and find a equal sign
        else if (mode == 0 && str[i] == '=') {
            key = token
            token = ''
            mode = 1
        }
        // When we're parsing the value and find a spacing character
        else if (mode == 1 && isSpacing(str[i])) {
            SMHelper.updatePropertyInObject(result, key, parseToken(token))
            token = key = ''
            mode = 0

            // If the next characters are spacing ones too, skip them
            while (isSpacing(str[i+1])) {
                i++
            }
        }
        // Otherwise, just add the character to the token
        else {
            token += str[i]
        }
    }

    // At the end, add the remaining token
    if (mode == 1) {
        SMHelper.updatePropertyInObject(result, key, parseToken(token))
    }
    // We must finish in mode = 1, or the string was malformed
    else {
        throw Error('Malformed string')
    }

    return result
}

module.exports = parseEnvVar
