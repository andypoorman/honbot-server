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
    let that = this;
    let joined = list.join('+');
    return api.call(this, `/multi_match/all/matchids/${joined}`).then(
        function(res) {
            let processed = [];
            _.forEach(list, function(n){
                var temp = [
                    _.filter(res[0], 'match_id', `${n}`),
                    _.filter(res[1], 'match_id', `${n}`),
                    _.filter(res[2], 'match_id', `${n}`),
                    _.filter(res[3], 'match_id', `${n}`)
                ];
                // filter out non exist
                if(temp[0].length !== 0 && temp[1].length !== 0){
                    processed.push(processMatch(temp));
                }
            });
            processed.updated = moment.utc().toDate();
            that.db.collection('matches').insert(processed, {multi: true});
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
    _.forEach(match[1], function(n){
        items[n.account_id] = [];
        _.forEach(_.range(1, 7), function(i){
            items[n.account_id].push(Number(n[`slot_${i}`]) || null);
        });
    });
    processed.players = [];
    _.forEach(match[2], function(n) {
        processed.players.push({
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
            mmr_change: parseFloat(n.amm_team_rating),
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
            kdr: Number((parseFloat(n.herokills) / parseFloat(n.deaths)).toFixed(3)),
            gpm: Number((parseFloat(n.gold) / minutes).toFixed(3)),
            xpm: Number((parseFloat(n.exp) / minutes).toFixed(3)),
            apm: Number((parseFloat(n.actions) / minutes).toFixed(3)),
            consumables: Number(n.consumables),
            wards: Number(n.wards)
        });
    });
    return processed;
};

module.exports = {
    multigrab: multigrab,
    lookup: lookup
};
