'use strict'

// Sample configuration object
const params = {
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
            'a--not-found',
            null
        ],
        testenv2: [
            '--not-found-2',
            /--still(.*?)notfound/
        ]
    }
}

// Expected configuration for testenv1 and testenv2
const defaultExpect = {
    foo: 'bar',
    hello: 'world',
    number: 6,
    ary: [0, 1, 1, 2, 3, 5, 8, 13, 21],
    obj: {
        x: 1,
        y: 2
    }
}

const testenv1Expect = {
    foo: 'bar',
    hello: 'mondo',
    number: 6,
    ary: [0, 1, 1, 2, 3, 5, 8, 13, 21],
    obj: {
        x: 1,
        y: 2,
        z: 3
    },
    add: 'me'
}

const testenv2Expect = {
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

// Expected configuration when adding the addendum file
const addendumExpect = {
    foo: 'bar',
    hello: 'world',
    number: 6,
    ary: [0, 1, 1, 2, 3, 5, 8, 13, 21],
    obj: {
        x: 1,
        y: 2
    },
    fruit: 'pear'
}

module.exports = {
    params: params,
    defaultExpect: defaultExpect,
    testenv1Expect: testenv1Expect,
    testenv2Expect: testenv2Expect,
    addendumExpect: addendumExpect
}
