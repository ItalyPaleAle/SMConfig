'use strict'

/* eslint-disable */

const SMConfig = require('../../index')
const conf = new SMConfig(__dirname + '/testconfig.json')
console.log(JSON.stringify(conf.all))
