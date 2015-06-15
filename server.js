'use strict';
/**
 * Koa Module dependencies.
 */
require('newrelic');
var koa = require('koa.io');
var logger = require('koa-logger');
var compress = require('koa-compress');
var cors = require('kcors');
var moment = require('moment');
var _ = require('lodash-node');
var route = require('koa-route');
var JSONStream = require('JSONStream');
var ratelimit = require('koa-ratelimit');
var redis = require('redis');
var gm = require('gm').subClass({imageMagick: true});

var player = require('./src/player');
var match = require('./src/match');
var mongo = require('./src/mongo');
var config = require('./config');

var app = koa();
app.proxy = true;

if (config.debug) {
    app.use(logger());
}

app.use(ratelimit({
  db: redis.createClient(),
  duration: 900000,
  max: 100,
  id: function (context) {
    return context.ip;
  }
}));
app.use(compress());
app.use(cors());
app.use(mongo());

// json middleware
app.use(function*(next) {
    this.type = 'json';
    yield next;
});

app.use(route.get('/player/:player', function*(playerName, next) {
    let updated;
    let exclude = {rnk_history: 0, cs_history: 0, acc_history: 0};
    let p = yield player.lookupPlayerNickname.call(this, playerName, exclude);
    if (p.length === 1) {
        p = p[0];
        if (moment.utc().diff(moment(p.updated), 'minutes') > 15) {
            updated = yield player.updatePlayer.call(this, playerName);
        }
    } else {
        updated = yield player.updatePlayer.call(this, playerName);
    }
    // not in database, couldn't get from api. Throw error
    if(p.length === 0 && updated && updated.error){
        this.status = 400;
        this.body = updated;
    }
    if(updated && !updated.error){
        this.app.io.emit('update', {nickname: updated.nickname});
        p = updated;
    }
    this.body = p;
    // alert user that data is old
    if(updated && this.body !== updated){
        this.body.fallback = true;
    }
    yield next;
}));

app.use(route.get('/bulkPlayers/:players', function*(playerList, next){
    let players = playerList.split(',');
    if(players.length > 50){
        this.throw(400);
    }
    players = _.map(players, function(n){
        return Number(n);
    });
    this.body = this.db.collection('players').find({account_id: {$in: players}}).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/history/:player/:page/:mode', function*(playerName, page, mode, next) {
    let count = Number(page) * 25;
    let p = yield player.lookupPlayerNickname.call(this, playerName, {});
    let updated;
    if (p.length === 1 && p[0].historyUpdated !== undefined) {
        p = p[0];
        if (moment.utc().diff(moment(p.historyUpdated), 'minutes') > 15) {
            updated = yield player.updateHistory.call(this, playerName);
        }
    } else {
        updated = yield player.updateHistory.call(this, playerName);
    }
    if (updated && !updated.error) {
        p = updated;
    }
    let sliced = _.slice(p[`${mode}_history`], count - 25, count);
    let lookup = yield match.lookup.call(this, sliced);
    let exists = _.pluck(lookup, 'id');
    let needs = _.difference(sliced, exists);
    if(needs.length >= 1){
        let added = yield match.multigrab.call(this, needs);
        if(added && !added.error){
            lookup = lookup.concat(added);
        }
    }
    this.body = _.sortByOrder(lookup, 'id', false);
    yield next;
}));

app.use(route.get('/match/:match', function*(matchID, next){
    let m = yield match.lookup.call(this, [Number(matchID)]);
    if (m.length !== 1) {
        m = yield match.multigrab.call(this, [matchID]);
    }
    this.body = m[0];
    yield next;
}));

app.use(route.get('/cache/:player/:mode', function*(playerID, mode, next) {
    let pid = Number(playerID);
    if(String(pid) !== playerID){
        this.status = 400;
        this.body = {error: 'User ID is not number.'};
    }
    let modes = {
        'rnk': 1,
        'cs': 2,
        'acc': 3
    };
    this.body = this.db.collection('matches').find({
        'players.player_id': pid,
        mode: modes[mode]
    }, {_id: 0}).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/counts', function*(next){
    let apilogger = this.db.collection('apilogger');
    let matches = this.db.collection('matches');
    let players = this.db.collection('players');
    this.body = {};
    this.body.players = yield new Promise(function(resolve) {
        players.count(function(err, count){
            resolve(count);
        });
    });
    this.body.matches = yield new Promise(function(resolve) {
        matches.count(function(err, count){
            resolve(count);
        });
    });
    let short = moment.utc().subtract(15, 'minutes').toDate();
    this.body.apiSuccess = yield new Promise(function(resolve) {
        apilogger.find({
            date: {$gte: short},
            status: 200
        }).count(function(err, count){
            resolve(count);
        });
    });
    this.body.apiFail = yield new Promise(function(resolve) {
        apilogger.find({
            date: {$gte: short},
            status: {$ne: 200}
        }).count(function(err, count){
            resolve(count);
        });
    });
    let gtr = moment.utc().subtract(1, 'day').toDate();
    this.body.api = yield new Promise(function(resolve) {
        apilogger.find({
            date: {$gte: gtr},
        }).count(function(err, count){
            resolve(count);
        });
    });
    yield next;
}));

app.use(route.get('/recentPlayers', function*(next){
    this.body = this.db.collection('players').find({}, {nickname: 1}, {limit: 20}).sort({updated: -1}).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/recentAPI', function*(next){
    let gtr = moment.utc().subtract(1, 'day').toDate();
    this.body = this.db.collection('apilogger').find({date: {$gte: gtr}}, {_id: 0}).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/banner/:player', function*(playerName){
    this.type = 'image/png';
    let p = yield player.lookupPlayerNickname.call(this, playerName, {});
    if (p.length === 1) {
        p = p[0];
        let mmr = Math.round(p.rnk_amm_team_rating);
        let win = p.rnk_wins;
        let loss = p.rnk_losses;
        this.body = yield new Promise(function(resolve) {
            gm(400, 60, '#000')
            .fill('#ffffff')
            .font('Prototype.ttf', 30)
            .drawText(3, 26, p.nickname)
            .font('Prototype.ttf', 12)
            .drawText(325, 10, 'honbot.com')
            .font('Prototype.ttf', 18)
            .fill('#0080FF')
            .drawText(3, 53, `MMR: ${mmr}`)
            .fill('#009900')
            .drawText(105, 53, `W: ${win}`)
            .fill('#990000')
            .drawText(175, 53, `L: ${loss}`)
            .toBuffer('PNG',function (err, buffer) {
              resolve(buffer);
            });
        });
    }
}));

app.listen(config.port);

module.exports = app;
