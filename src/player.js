'use strict';

import api from './api';
var _ = require('lodash-node');
var moment = require('moment');

class Player {
    constructor(db, nickname){
        this.db = db;
        this.players = db.collection('players');
        this.nick = nickname.toLowerCase();
    }
    lookupPlayerID(id) {
        return new Promise((resolve) => {
            this.players.find({
                'account_id': Number(id)
            }).limit(1).toArray(function(err, docs) {
                resolve(docs);
            });
        });
    }
    lookupPlayerNickname(exclude) {
        return new Promise((resolve) => {
            this.players.find({
                'nick': this.nick
            }, exclude || {}).limit(1).toArray(function(err, docs) {
                resolve(docs);
            });
        });
    }
    updatePlayer(ip, io) {
        return new api(this.db, ip, io).fetch(`/player_statistics/all/nickname/${this.nick}/`).then(
            (res) => {
                if (res.account_id === '0') {
                    return {
                        error: 'Player banned or missing. Got account_id 0.'
                    };
                }
                res = this.processPlayer(res);
                res.updated = moment.utc().toDate();
                this.players.update({account_id: res.account_id}, {$set: res}, {upsert: true});
                return res;
            }, 
            (error) => {
                return {error: error.message};
            }
        );
    }
    updateHistory(mode, ip, io) {
        let realmode = {
            'rnk': 'ranked',
            'cs': 'casual',
            'acc': 'public'
        }[mode];
        return new api(this.db, ip, io).fetch(`/match_history/${realmode}/nickname/${this.nick}/`).then(
            (res) => {
                let data = {
                    account_id: Number(res[0].account_id)
                };
                data[`${mode}_history`] = res[0].history.match(/([0-9]{6,12})/g).map(Number).reverse();
                return data;
            }, (error) => {
                return {
                    error: error.message
                };
            }
        );
    }
    processPlayer(p) {
        // initial string parsing
        p = _.mapValues(p, function(n) {
            if (!isNaN(n)) {
                return Number(n);
            }
            return n;
        });
        // make averages
        for (let n of['rnk', 'cs', 'acc']) {
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
        }
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
    }
}

export default Player;