'use strict';

var api = require('./api');
var _ = require('lodash');
var moment = require('moment');

var History = function(db){
    this.db = db;
}

module.exports = History;