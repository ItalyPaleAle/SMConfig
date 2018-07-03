/*eslint-env mocha */

'use strict'

require('should')
const assert = require('assert')
const parseEnvVar = require('../lib/parseEnvVar')

describe('parseEnvVar', function() {
    it('Single key-value pair', function() {
        const test = parseEnvVar('key=value')
        const expect = {
            key: 'value'
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Single key-value pair (nested)', function() {
        const test = parseEnvVar('key.a=value')
        const expect = {
            key: {
                a: 'value'
            }
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Multiple key-value pairs', function() {
        const test = parseEnvVar('key=value hello=world')
        const expect = {
            key: 'value',
            hello: 'world'
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Multiple key-value pairs (nested)', function() {
        const test = parseEnvVar('key.a=value hello=world help.me=yes')
        const expect = {
            key: {
                a: 'value'
            },
            hello: 'world',
            help: {
                me: 'yes'
            }
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Numeric values', function() {
        const test = parseEnvVar('key=value intNumber=8 negative=-12 float=-12.3')
        const expect = {
            key: 'value',
            intNumber: 8,
            negative: -12,
            float: -12.3
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Quoted values', function() {
        let test, expect

        // Double quote
        test = parseEnvVar('key="value"')
        expect = {
            key: 'value'
        }
        assert.deepStrictEqual(test, expect)

        // Single quote
        test = parseEnvVar('key=\'value\'')
        expect = {
            key: 'value'
        }
        assert.deepStrictEqual(test, expect)

        // Space inside value
        test = parseEnvVar('key="hello world"')
        expect = {
            key: 'hello world'
        }
        assert.deepStrictEqual(test, expect)

        // Same, with single quotes
        test = parseEnvVar('key=\'hello world\'')
        expect = {
            key: 'hello world'
        }
        assert.deepStrictEqual(test, expect)

        // Multiple values
        test = parseEnvVar('key=\'hello world\' name="Leonardo Da Vinci"')
        expect = {
            key: 'hello world',
            name: 'Leonardo Da Vinci'
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Quoted keys', function() {
        let test, expect

        // Double quote
        test = parseEnvVar('"key"="value"')
        expect = {
            key: 'value'
        }
        assert.deepStrictEqual(test, expect)

        // Single quote
        test = parseEnvVar('\'key\'=\'value\'')
        expect = {
            key: 'value'
        }
        assert.deepStrictEqual(test, expect)

        // = inside key name
        test = parseEnvVar('"k=ey"="hello world"')
        expect = {
            'k=ey': 'hello world'
        }
        assert.deepStrictEqual(test, expect)

        // Same, with single quotes
        test = parseEnvVar('\'k=ey\'=\'hello world\'')
        expect = {
            'k=ey': 'hello world'
        }
        assert.deepStrictEqual(test, expect)

        // Multiple values
        test = parseEnvVar('"k=ey"=\'hello world\' "name="="Leonardo Da Vinci"')
        expect = {
            'k=ey': 'hello world',
            'name=': 'Leonardo Da Vinci'
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Escape character', function() {
        let test, expect

        // Escape outside of a quoted block
        test = parseEnvVar('key=\\\'value key2=\\"value key3=\\\\value')
        expect = {
            key: '\'value',
            key2: '"value',
            key3: '\\value'
        }
        assert.deepStrictEqual(test, expect)

        // Escape inside a quoted block - single quotes
        test = parseEnvVar('key=\'un po\\\' di zucchero\'')
        expect = {
            key: 'un po\' di zucchero'
        }
        assert.deepStrictEqual(test, expect)

        // Escape inside a quoted block - double quotes
        test = parseEnvVar('key="un po\' di \\"zucchero\\""')
        expect = {
            key: 'un po\' di "zucchero"'
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Multiple spacing characters between pairs', function() {
        let test, expect

        // Multiple spaces
        test = parseEnvVar('"k=ey"=\'hello world\'    "name="="Leonardo Da Vinci"')
        expect = {
            'k=ey': 'hello world',
            'name=': 'Leonardo Da Vinci'
        }
        assert.deepStrictEqual(test, expect)

        // Other spacing characters
        test = parseEnvVar('"k=ey"=\'hello world\'\n   "name="="Leonardo Da Vinci"')
        expect = {
            'k=ey': 'hello world',
            'name=': 'Leonardo Da Vinci'
        }
        assert.deepStrictEqual(test, expect)

        // Other spacing characters
        test = parseEnvVar('"k=ey"=\'hello world\'\n\t\t"name="="Leonardo Da Vinci"\r\na=12.3')
        expect = {
            'k=ey': 'hello world',
            'name=': 'Leonardo Da Vinci',
            a: 12.3
        }
        assert.deepStrictEqual(test, expect)
    })

    it('Invalid syntax', function() {
        // Key without value
        assert.throws(() => {
            parseEnvVar('key')
        }, /Malformed string/)

        // Last key is without value
        assert.throws(() => {
            parseEnvVar('a=b   key')
        }, /Malformed string/)

        // Closing quote missing
        assert.throws(() => {
            parseEnvVar('a=b   key="a')
        }, /Malformed string/)

        // Closing quote missing
        assert.throws(() => {
            parseEnvVar('a=\'b   key="a')
        }, /Malformed string/)
    })
})
