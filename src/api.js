'use strict';

var http = require('http');
var concat = require('concat-stream');
var config = require('../config');
var moment = require('moment');


var api = function(path, count) {
    let that = this;
    if (!count) {
        count = 0;
    }
    return new Promise(function(resolve, reject) {
        http.get({
            host: 'api.heroesofnewerth.com',
            path: `${path}?token=${config.token}`
        }, function(response) {
            console.log(`${path}?token=${config.token}`, response.statusCode);
            that.db.collection('apilogger').insert({
                date: moment.utc().toDate(),
                api: path,
                ip: that.request.ip,
                host: response.hostname,
                status: response.statusCode
            });
            if (response.statusCode === 200) {
                that.app.io.emit('api', {success: true});
                response.pipe(concat(function(body) {
                    var parsed = JSON.parse(body);
                    resolve(parsed);
                }));
            } else if (response.statusCode === 429) {
                that.app.io.emit('api', {success: false});
                if (count > 10) {
                    reject(Error('Bad S2 API response'));
                } else {
                    setTimeout(function() {
                        resolve(api.call(that, path, count + 1));
                    }, 150);
                }
            } else {
                reject(Error('Bad S2 API response'));
            }
        });
    });
};

module.exports = api;