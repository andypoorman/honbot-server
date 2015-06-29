'use strict';
// from https://github.com/MangroveTech/koa-mongo
var MongoClient = require('mongodb').MongoClient;
var pool = require('generic-pool');
var config = require('../config');

var max = config.max || 100;
var min = config.min || 1;
var timeout = config.timeout || 30000;
var mongoUrl = config.db;

function mongo() {
    return pool.Pool({
        name: 'mongodb',
        max: max,
        min: min,
        idleTimeoutMillis: timeout,
        log: false,
        create: (callback) => {
            console.log('create');
            MongoClient.connect(mongoUrl, {
                server: {
                    poolSize: 1
                },
                native_parser: true,
                auto_reconnect: true
            }, function(err, client) {
                console.log('OPENEDBACK');
                if (err) {
                    throw err;
                }
                callback(err, client);
            });
        },

        destroy: function(client) {
            console.log('CLOSEDB');
            client.close();
        }
    });
}

export default mongo;