'use strict';

var api = require('./api');
var _ = require('lodash-node');
var moment = require('moment-timezone');

var lookup = function(list) {
    let matches = this.db.collection('matches');
    return new Promise(function(resolve) {
        matches.find({
            'id': {$in: list}
        }).toArray(function(err, docs) {
            resolve(docs);
        });
    });
};

var multigrab = function(list) {
    let matches = this.db.collection('matches');
    let joined = list.join('+').split('+0+')[0];
    return api.call(this, `/multi_match/all/matchids/${joined}`).then(
        function(res) {
            let processed = _.map(list, function(n){
                var temp = [
                    _.filter(res[0], 'match_id', `${n}`),
                    _.filter(res[1], 'match_id', `${n}`),
                    _.filter(res[2], 'match_id', `${n}`),
                    _.filter(res[3], 'match_id', `${n}`)
                ];
                // filter out non exist
                if(temp[0].length !== 0 && temp[1].length !== 0){
                    return processMatch(temp);
                }
            });
            processed = _.compact(processed);
            matches.insert(processed, {multi: true});
            return processed;
        },
        function(error) {
            return {
                error: error.message
            };
        }
    );
};

var processMatch = function(match) {
    let processed = {};
    let items = {};
    if(match[0][0].officl === '1' && match[0][0].cas === '1' && match[0][0].nl === '1'){
        // casual
        processed.mode = 2;
    } else if (match[0][0].officl === '1' && match[0][0].cas === '0' && match[0][0].nl === '1'){
        // ranked
        processed.mode = 1;
    } else {
        processed.mode = 3;
    }
    processed.length = Number(match[3][0].time_played);
    let minutes = moment.duration(processed.length, 'seconds').asMinutes();
    processed.version = match[3][0].version;
    processed.map_used = match[3][0].map;
    processed.date = moment.tz(match[3][0].mdt, 'YYYY-MM-DD HH:mm:ss', 'America/Detroit').toDate();
    processed.id = Number(match[3][0].match_id);
    // create array of items
    let slots = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6'];
    for (let n of match[1]) {
        items[n.account_id] = [];
        for (let i of slots){
            items[n.account_id].push(Number(n[i]) || null);
        }
    }
    processed.players = _.map(match[2], function(n) {
        return {
            player_id: Number(n.account_id),
            match_id: processed.id,
            nickname: n.nickname,
            clan_id: Number(n.clan_id),
            hero_id: Number(n.hero_id),
            position: Number(n.position),
            items: items[n.account_id],
            team: Number(n.team),
            level: Number(n.level),
            win: n.wins === '1',
            concedes: Number(n.concedes),
            concedevotes: Number(n.concedevotes),
            buybacks: Number(n.buybacks),
            discos: Number(n.discos),
            kicked: Number(n.kicked),
            mmr_change: Number(n.amm_team_rating),
            herodmg: Number(n.herodmg),
            kills: Number(n.herokills),
            assists: Number(n.heroassists),
            deaths: Number(n.deaths),
            goldlost2death: Number(n.goldlost2death),
            secs_dead: Number(n.secs_dead),
            cs: Number(n.teamcreepkills) + Number(n.neutralcreepkills),
            bdmg: Number(n.bdmg),
            denies: Number(n.denies),
            exp_denied: Number(n.exp_denied),
            kdr: Number((Number(n.herokills) / Number(n.deaths)).toFixed(3)),
            gpm: Number((Number(n.gold) / minutes).toFixed(3)),
            xpm: Number((Number(n.exp) / minutes).toFixed(3)),
            apm: Number((Number(n.actions) / minutes).toFixed(3)),
            consumables: Number(n.consumables),
            wards: Number(n.wards)
        };
    });
    return processed;
};

module.exports = {
    multigrab: multigrab,
    lookup: lookup
};
