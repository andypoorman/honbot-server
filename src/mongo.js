// from https://github.com/MangroveTech/koa-mongo
var MongoClient = require('mongodb').MongoClient;
var poolModule = require('generic-pool');
var config = require('../config');
var debug = require('debug')('koa-mongo');

module.exports = mongo;

function mongo() {
    var max = config.max || 100;
    var min = config.min || 1;
    var timeout = config.timeout || 30000;
    var log = config.log || false;
    var mongoUrl = config.db;

    var mongoPool = poolModule.Pool({
        name: 'koa-mongo',
        create: function(callback) {
            MongoClient.connect(mongoUrl, {
                server: {
                    poolSize: 1
                },
                native_parser: true
            }, function(err, client) {
                if (err) {
                    throw err;
                }
                callback(err, client);
            });
        },
        destroy: function(client) {
            client.close();
        },
        max: max,
        min: min,
        idleTimeoutMillis: timeout,
        log: log
    });

    return function* mongo(next) {
        this.db = yield mongoPool.acquire;
        if (!this.db) {
            this.throw('Fail to acquire one mongo connection');
        }
        debug('Acquire one connection (min: %s, max: %s, poolSize: %s)', min, max, mongoPool.getPoolSize());
        try {
            yield *next;
        } catch (e) {
            throw e;
        } finally {
            mongoPool.release(this.db);
            debug('Release one connection (min: %s, max: %s, poolSize: %s)', min, max, mongoPool.getPoolSize());
        }
    };
}