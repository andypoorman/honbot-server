'use strict';

var https = require('https');
var api = require('./api');
var _ = require('lodash');
var moment = require('moment');

var lookupPlayerID = function(id) {
    var that = this;
    return new Promise(function(resolve) {
        that.db.collection('players').find({
            'account_id': Number(id)
        }).limit(1).toArray(function(err, docs) {
            resolve(docs);
        });
    });
};

var lookupPlayerNickname = function (nickname, exclude){
    var that = this;
    return new Promise(function(resolve) {
        that.db.collection('players').find({
            'nick': nickname.toLowerCase()
        }, exclude).limit(1).toArray(function(err, docs) {
            resolve(docs);
        });
    });
};

var updatePlayer = function (nickname){
    var that = this;
    return api.call(this, `/player_statistics/all/nickname/${nickname}/`).then(
        function(res) {
            if(res.account_id === '0'){
                return {error: 'Player banned or missing. Got account_id 0.'};
            }
            var processed = processPlayer(res);
            processed.updated = moment.utc().toDate();
            that.db.collection('players').update({account_id: processed.account_id}, {$set: processed}, {upsert: true});
            return processed;
        },
        function(error) {
            return {
                error: error.message
            };
        }
    );
};

var updateHistory = function(nickname) {
    var that = this;
    return api.call(this, `/match_history/all/nickname/${nickname}/`).then(
        function(res) {
            var processed = processHistory(res);
            processed.historyUpdated = moment.utc().toDate();
            that.db.collection('players').update({nick: nickname.toLowerCase()}, {$set: processed}, {upsert: true});
            return processed;
        },
        function(error) {
            return {
                error: error.message
            };
        }
    );
};

var processHistory = function(res) {
    var data = [[], [], []];
    _.forEach(res, function(i, key){
        data[key] = _.map(i.history.split(','), function(n){
            return Number(n.split('|')[0]);
        }).sort(function(a,b){return b - a;});
    });
    return {
        rnk_history: data[0],
        cs_history: data[1],
        acc_history: data[2]
    };
};

var processPlayer = function(res) {
    var p = {};
    // initial string parsing
    _.forEach(res, function(n, key) {
        if (isFloat(n)) {
            p[key] = parseFloat(n);
        } else if (isInt(n)) {
            p[key] = parseInt(n);
        } else {
            p[key] = n;
        }
    });
    p.nick = p.nickname.toLowerCase();
    // make averages
    _.forEach(['rnk', 'cs', 'acc'], function(n) {
        p[`${n}_avg_kills`] = p[`${n}_herokills`] / p[`${n}_games_played`];
        p[`${n}_avg_deaths`] = p[`${n}_deaths`] / p[`${n}_games_played`];
        p[`${n}_avg_assists`] = p[`${n}_heroassists`] / p[`${n}_games_played`];
        p[`${n}_avg_creeps`] = (p[`${n}_neutralcreepkills`] + p[`${n}_teamcreepkills`]) / p[`${n}_games_played`];
        p[`${n}_avg_denies`] = p[`${n}_denies`] / p[`${n}_games_played`];
        var temptime = p[`${n}_secs`] / 60;
        p[`${n}_avg_xpm`] = p[`${n}_exp`] / temptime;
        p[`${n}_avg_apm`] = p[`${n}_actions`] / temptime;
        p[`${n}_avg_gpm`] = p[`${n}_gold`] / temptime;
        p[`${n}_avg_bdmg`] = p[`${n}_bdmg`] / p[`${n}_games_played`];
        p[`${n}_avg_herodmg`] = p[`${n}_herodmg`] / p[`${n}_games_played`];
        p[`${n}_avg_consumables`] = p[`${n}_consumables`] / p[`${n}_games_played`];
        p[`${n}_avg_time`] = temptime / p[`${n}_games_played`];
        p[`${n}_winpercent`] = p[`${n}_wins`] / p[`${n}_games_played`];
        p[`${n}_kdr`] = p[`${n}_herokills`] / p[`${n}_deaths`];
        p[`${n}_avg_wards`] = p[`${n}_wards`] / p[`${n}_games_played`];
        p[`${n}_kadr`] = (p[`${n}_herokills`] + p[`${n}_heroassists`]) / p[`${n}_deaths`];
    });
    // round down sigs
    _.forEach(p, function(n, key) {
        if (isFloat(n)) {
            p[key] = parseFloat(n.toFixed(3));
        }
    });
    return p;
};

var isInt = function (n) {
    return Number(n) == n && n % 1 === 0;
};

var isFloat = function (n) {
    return n == Number(n) && n % 1 !== 0;
};

module.exports = {
    lookupPlayerID: lookupPlayerID,
    lookupPlayerNickname: lookupPlayerNickname,
    updatePlayer: updatePlayer,
    updateHistory: updateHistory
};
