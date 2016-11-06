'use strict';

const should = require('should')
const assert = require('assert')
const os = require('os')
const SMConfig = require('../index')
const SMHelper = require('smhelper')

describe('SMConfig.js', () => {

    it('SMConfig should export a class', () => {
        SMConfig.should.be.type('function')
        SMConfig.prototype.should.be.type('object')

        let config = new SMConfig({default: {}})
        assert.ok(config)

        config.all.should.be.type('object')
        config.environment.should.be.type('string')
        config.get.should.be.type('function')
    })

    describe('Constructor method', () => {
        let originalEnv

        // Sample configuration object
        let params = {
            default: {
                foo: 'bar',
                hello: 'world',
                number: 6,
                ary: [0, 1, 1, 2, 3, 5, 8, 13, 21],
                obj: {
                    x: 1,
                    y: 2
                }
            },
            testenv1: {
                hello: 'mondo',
                obj: {
                    z: 3
                },
                add: 'me'
            },
            testenv2: {
                ary: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
                first: 'last'
            },
            hostnames: {
                testenv1: [
                    'a--not-found'
                ],
                testenv2: [
                    '--not-found-2',
                    /\-\-still(.*?)notfound/
                ]
            }
        }

        // Expected configuration for testenv1 and testenv2
        let testenv1Expect = {
            foo: 'bar',
            hello: 'mondo',
            number: 6,
            ary: [0, 1, 1, 2, 3, 5, 8, 13, 21],
            obj: {
                z: 3
            },
            add: 'me'
        }
        let testenv2Expect = {
            foo: 'bar',
            hello: 'world',
            number: 6,
            ary: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
            obj: {
                x: 1,
                y: 2
            },
            first: 'last'
        }

        // Current machine's hostname
        let currentHostname = os.hostname()

        // Before all tests in this block, backup process.env
        before(() => {
            originalEnv = process.env
        })

        // After all tests, restore process.env
        after(() => {
            process.env = originalEnv
        })

        it('Configuration object', () => {
            // Parameter config not present
            assert.throws(() => {
                new SMConfig()
            })

            // Parameter config is not an object
            assert.throws(() => {
                new SMConfig('hello world')
            })

            // Missing config.default
            assert.throws(() => {
                new SMConfig({a: 1})
            })

            // config.default is not an object
            assert.throws(() => {
                new SMConfig({default: 1})
            })

            // All ok
            let config = new SMConfig({default: {}})
            assert.ok(config)
        })

        it('Environment: fallback to default', () => {
            // Remove process.env.NODE_ENV if present
            delete process.env.NODE_ENV

            // Test fallback to the "default" environment
            let config = new SMConfig(params)
            assert.equal(config.environment, 'default', "Fallback to 'default'")
        })

        it('Environment: from hostname (using RegExp)', function() {
            // Require current machine's hostname to be at least 5 chars
            if(!currentHostname || currentHostname.length < 5) {
                this.skip()
                return
            }

            // Escape function source: http://stackoverflow.com/a/4371855/192024
            let currentHostnameRegExp = new RegExp(currentHostname.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
            params.hostnames.hostenv = [
                /\-\-notfound/,
                currentHostnameRegExp
            ]
            let config = new SMConfig(params)
            assert.equal(config.environment, 'hostenv')
        })

        it('Environment: from hostname (exact string match)', function() {
            // Require current machine's hostname to be at least 5 chars
            if(!currentHostname || currentHostname.length < 5) {
                this.skip()
                return
            }

            params.hostnames.hostenv = [
                '--notfound',
                currentHostname
            ]
            let config = new SMConfig(params)
            assert.equal(config.environment, 'hostenv')
        })

        it('Environment: from hostname (string with *)', function() {
            // Require current machine's hostname to be at least 5 chars
            if(!currentHostname || currentHostname.length < 5) {
                this.skip()
                return
            }

            params.hostnames.hostenv = [
                '--notfound',
                currentHostname.slice(0, -1) + '*'
            ]
            let config = new SMConfig(params)
            assert.equal(config.environment, 'hostenv')
        })

        it('Environment: use NODE_ENV environmental variable', () => {
            // Note: in this test, process.hostname.hostenv should still be set
            // and it should be overridden

            // Set NODE_ENV environmental variable
            process.env.NODE_ENV = 'envvar'

            let config = new SMConfig(params)
            assert.equal(config.environment, 'envvar')
        })

        it('Environment: passing environment to constructor', () => {
            // Note: in this test, process.hostname.hostenv and NODE_ENV are still set,
            // but should both be overridden

            let config = new SMConfig(params, 'passedenv')
            assert.equal(config.environment, 'passedenv')
        })

        it('Configuration: load default configuration', () => {
            let config = new SMConfig(params, 'nonexisting')
            assert.deepStrictEqual(config.all, params.default)
        })

        it('Configuration: load configuration for specific environment', () => {
            let config

            config = new SMConfig(params, 'testenv1')
            assert.deepStrictEqual(config.all, testenv1Expect)

            process.env.NODE_ENV = 'testenv2'
            config = new SMConfig(params)
            assert.deepStrictEqual(config.all, testenv2Expect)
        })

        it('Configuration: overwrite at runtime with environmental variables', () => {
            process.env.APPSETTING_WHEN = 'runtime' // New
            process.env.APPSETTING_FIRST = 'overwrite' // Overwrite
            process.env.APPSETTING_INT_NUM = '-8' // camelCase

            let expect = SMHelper.cloneObject(testenv2Expect)
            expect.when = 'runtime'
            expect.first = 'overwrite'
            expect.intNum = -8

            let config = new SMConfig(params, 'testenv2')
            assert.deepStrictEqual(config.all, expect)
        })

        it('Configuration: overwrite at runtime with environmental variables (custom prefix)', () => {
            process.env.SET_WHEN = 'runtime-again' // New
            process.env.SET_FOO = 'overwrite-2' // Overwrite
            process.env.SET_SOME_FLOAT = '19.91' // camelCase

            let expect = SMHelper.cloneObject(params.default)
            expect.when = 'runtime-again'
            expect.foo = 'overwrite-2'
            expect.someFloat = 19.91

            let config = new SMConfig(params, 'default', 'SET_')
            assert.deepStrictEqual(config.all, expect)
        })

        it('Configuration: file does not exist', () => {
            assert.throws(() => {
                new SMConfig('test/not-found.json')
            }, /exist|found/)
        })

        it('Configuration: unrecognized format', () => {
            assert.throws(() => {
                new SMConfig('test/resources/invalid-format.txt')
            }, /file format/)
        })

        it('Configuration: load from JSON file', () => {
            // Use another prefix for env vars so the ones set before are ignored
            let config = new SMConfig('test/resources/testconfig.json', 'testenv2', 'NOTHING_')
            assert.deepStrictEqual(config.all, testenv2Expect)
        })

        it('Configuration: load from YAML file', () => {
            // Use another prefix for env vars so the ones set before are ignored
            let config = new SMConfig('test/resources/testconfig.yaml', 'testenv2', 'NOTHING_')
            assert.deepStrictEqual(config.all, testenv2Expect)
        })

        it('Configuration: load from Hjson file', () => {
            // Use another prefix for env vars so the ones set before are ignored
            let config = new SMConfig('test/resources/testconfig.hjson', 'testenv2', 'NOTHING_')
            assert.deepStrictEqual(config.all, testenv2Expect)
        })
    })

    describe('Object methods', () => {
        it('SMConfig.environment should return environment name', () => {
            let config = new SMConfig({default: {}}, 'myenv')
            assert.strictEqual(config.environment, 'myenv')
        })

        it('SMConfig.environment should be read-only', () => {
            let config = new SMConfig({default: {}}, 'myenv')
            assert.throws(() => {
                config.environment = 'newenv'
            }, /TypeError/)
        })

        it('SMConfig.all should return all configuration options', () => {
            // Use another prefix for env vars so the ones set before are ignored
            let config = new SMConfig({default: {a: 1}, myenv: {b: 2}}, 'myenv', 'NOTHING_')
            assert.deepStrictEqual(config.all, {a: 1, b: 2})
        })

        it('SMConfig.all should be read-only', () => {
            let config = new SMConfig({default: {}}, 'myenv')
            assert.throws(() => {
                config.all = {hello: 'world'}
            }, /TypeError/)
        })

        it('SMConfig.get should return value for configuration key', () => {
            // Use another prefix for env vars so the ones set before are ignored
            let config = new SMConfig({default: {a: 1}, myenv: {b: 'ale', foo: ['bar']}}, 'myenv', 'NOTHING_')
            assert.deepStrictEqual(config.get('a'), 1)
            assert.deepStrictEqual(config.get('b'), 'ale')
            assert.deepStrictEqual(config.get('foo'), ['bar'])
        })
    })
})
