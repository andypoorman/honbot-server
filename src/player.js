'use strict';

var api = require('./api');
var _ = require('lodash-node');
var moment = require('moment');

var lookupPlayerID = function(id) {
    let db = this.db;
    return new Promise(function(resolve) {
        db.collection('players').find({
            'account_id': Number(id)
        }).limit(1).toArray(function(err, docs) {
            resolve(docs);
        });
    });
};

var lookupPlayerNickname = function (nickname, exclude){
    let db = this.db;
    return new Promise(function(resolve) {
        db.collection('players').find({
            'nick': nickname.toLowerCase()
        }, exclude).limit(1).toArray(function(err, docs) {
            resolve(docs);
        });
    });
};

var updatePlayer = function (nickname){
    let players = this.db.collection('players');
    return api.call(this, `/player_statistics/all/nickname/${nickname}/`).then(
        function(res) {
            if(res.account_id === '0'){
                return {error: 'Player banned or missing. Got account_id 0.'};
            }
            res = processPlayer(res);
            res.updated = moment.utc().toDate();
            players.update({account_id: res.account_id}, {$set: res}, {upsert: true});
            return res;
        },
        function(error) {
            return {
                error: error.message
            };
        }
    );
};

var updateHistory = function(nickname, mode) {
    let realmode = {
        'rnk': 'ranked',
        'cs': 'casual',
        'acc': 'public'
    }[mode];
    return api.call(this, `/match_history/${realmode}/nickname/${nickname}/`).then(
        function(res) {
            res = processHistory(res, mode);
            return res;
        },
        function(error) {
            return {
                error: error.message
            };
        }
    );
};

var processHistory = function(res, mode) {
    let data = {account_id: Number(res[0].account_id)};
    data[`${mode}_history`] = _.map(res[0].history.match(/([0-9]{6,12})/g), function(n){
        return Number(n);
    }).sort(function(a, b){return b-a;});
    return data;
};

var processPlayer = function(p) {
    // initial string parsing
    p = _.mapValues(p, function(n){
        if (!isNaN(n)) {
            return Number(n);
        }
        return n;
    });
    // make averages
    _.forEach(['rnk', 'cs', 'acc'], function(n) {
        p[`${n}_avg_kills`] = p[`${n}_herokills`] / p[`${n}_games_played`];
        p[`${n}_avg_deaths`] = p[`${n}_deaths`] / p[`${n}_games_played`];
        p[`${n}_avg_assists`] = p[`${n}_heroassists`] / p[`${n}_games_played`];
        p[`${n}_avg_creeps`] = (p[`${n}_neutralcreepkills`] + p[`${n}_teamcreepkills`]) / p[`${n}_games_played`];
        p[`${n}_avg_denies`] = p[`${n}_denies`] / p[`${n}_games_played`];
        let temptime = p[`${n}_secs`] / 60;
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
    p = _.mapValues(p, function(n) {
        // check if number is float
        if (typeof n === 'number' && n % 1 !== 0) {
            return Number(n.toFixed(3));
        }
        return n;
    });
    // Lowercase nickname for string matching later
    p.nick = p.nickname.toLowerCase();
    return p;
};

module.exports = {
    lookupPlayerID: lookupPlayerID,
    lookupPlayerNickname: lookupPlayerNickname,
    updatePlayer: updatePlayer,
    updateHistory: updateHistory
};
