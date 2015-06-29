'use strict';

var http = require('http');
var concat = require('concat-stream');
var moment = require('moment');

import config from '../config';


class api {
    constructor(db, ip, io) {
        this.apilogger = db.collection('apilogger');
        this.ip = ip;
        this.io = io;
    }
    fetch(path, count) {
        if (!count) {
            count = 0;
        }
        return new Promise((resolve, reject) => {
            http.get({
                host: 'api.heroesofnewerth.com',
                path: `${path}?token=${config.token}`
            }, (response) => {
                console.log(`${path}?token=${config.token}`, response.statusCode);
                this.apilogger.insert({
                    date: moment.utc().toDate(),
                    api: path,
                    ip: this.ip,
                    host: response.hostname,
                    status: response.statusCode
                });
                if (response.statusCode === 200) {
                    this.io.emit('api', {success: true});
                    response.pipe(concat(function(body) {
                        var parsed = JSON.parse(body);
                        resolve(parsed);
                    }));
                } else if (response.statusCode === 429) {
                    this.io.emit('api', {success: false});
                    if (count > 10) {
                        reject(Error('Bad S2 API response'));
                    } else {
                        setTimeout(function() {
                            resolve(this.api(path, count + 1));
                        }, 150);
                    }
                } else {
                    reject(Error('Bad S2 API response'));
                }
            });
        });
    }
}

export default api;