import 'mocha'
import assert from 'assert'
import {exec} from 'child_process'
import expected = require('./resources/expected')
import SMHelper from 'smhelper'

const execPromise = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                return reject(err)
            }

            resolve({stdout, stderr})
        })
    })
}

describe('SMConfig test via shell', function() {

    const defaultExpect = expected.defaultExpect as any
    const testenv2Expect = expected.testenv2Expect as any

    // Check if the shell is available
    before(function() {
        const self = this
        return execPromise('node -v')
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('Skipping shell tests', err.message)
                self.skip()
            })
    })

    it('Call the test script', function() {
        this.slow(1000)

        return execPromise('node test/resources/test-script.js')
            .then((result: any) => {
                assert.ok(result.stdout)
                const obj = JSON.parse(result.stdout)
                assert.deepStrictEqual(obj, defaultExpect)
            })
    })

    it('Passing environment via NODE_ENV', function() {
        this.slow(1000)

        const command = [
            'NODE_ENV=testenv2',
            'node test/resources/test-script.js'
        ].join(' ')
        return execPromise(command)
            .then((result: any) => {
                assert.ok(result.stdout)
                const obj = JSON.parse(result.stdout)
                assert.deepStrictEqual(obj, testenv2Expect)
            })
    })

    it('Passing param via env vars', function() {
        this.slow(1000)

        const expect = SMHelper.cloneObject(testenv2Expect)
        expect.when = 'runtime'

        const command = [
            'NODE_ENV=testenv2',
            'SMCONFIG=when=runtime',
            'node test/resources/test-script.js'
        ].join(' ')
        return execPromise(command)
            .then((result: any) => {
                assert.ok(result.stdout)
                const obj = JSON.parse(result.stdout)
                assert.deepStrictEqual(obj, expect)
            })
    })

    it('Passing multiple params via env vars', function() {
        this.slow(1000)

        const expect = SMHelper.cloneObject(testenv2Expect)
        expect.when = 'run"time'
        expect.first = 'overwrite'
        expect.intNum = -8

        const command = [
            'NODE_ENV=testenv2',
            'SMCONFIG="when=run\\\\\\"time first=\'overwrite\' intNum=-8"', // 6 slashes required!
            'node test/resources/test-script.js'
        ].join(' ')
        return execPromise(command)
            .then((result: any) => {
                assert.ok(result.stdout)
                const obj = JSON.parse(result.stdout)
                assert.deepStrictEqual(obj, expect)
            })
    })

    it('Using multiple env vars', function() {
        this.slow(1000)

        const expect = SMHelper.cloneObject(testenv2Expect)
        expect.when = 'runtime'
        expect.first = 'overwrite'
        expect.intNum = -8

        const command = [
            'NODE_ENV=testenv2',
            'SMCONFIG_1=when=runtime',
            'SMCONFIG_2="first=overwrite intNum=-8"',
            'node test/resources/test-script.js'
        ].join(' ')
        return execPromise(command)
            .then((result: any) => {
                assert.ok(result.stdout)
                const obj = JSON.parse(result.stdout)
                assert.deepStrictEqual(obj, expect)
            })
    })

    it('Env var file', function() {
        this.slow(1000)

        const expect = SMHelper.cloneObject(defaultExpect)
        expect.fruit = 'cherry'
        expect.cake = 0.33
        expect.quote = 'la nebbia agl\'irti colli piovigginando sale'
        expect.obj.z = 'foo'

        const command = [
            'SMCONFIG_FILE=test/resources/env',
            'node test/resources/test-script.js'
        ].join(' ')
        return execPromise(command)
            .then((result: any) => {
                assert.ok(result.stdout)
                const obj = JSON.parse(result.stdout)
                assert.deepStrictEqual(obj, expect)
            })
    })

})
