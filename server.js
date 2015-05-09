'use strict';
/**
 * Koa Module dependencies.
 */
var koa = require('koa.io');
var logger = require('koa-logger');
var router = require('koa-router');
var compress = require('koa-compress');
var cors = require('koa-cors');
var moment = require('moment');
var _ = require('lodash');
var JSONStream = require('JSONStream');
var ratelimit = require('koa-ratelimit');
var redis = require('redis');

var player = require('./src/player');
var match = require('./src/match');
var mongo = require('./src/mongo');
var config = require('./config');

var app = koa();

if (config.debug) {
    app.use(logger());
}

app.io.use(function* (next) {
  // on connect
  yield* next;
  // on disconnect
});

app.use(ratelimit({
  db: redis.createClient(),
  duration: 900000,
  max: 75,
  id: function (context) {
    return context.ip;
  }
}));
app.use(compress());
app.use(cors());
app.use(mongo());
app.use(router(app));

// json middleware
app.use(function*(next) {
    this.type = 'json';
    yield next;
});

app.get('/player/:player/', function*(next) {
    var updated;
    var p = yield player.lookupPlayerNickname.call(this, this.params.player);
    if (p.length === 1) {
        p = p[0];
        if (moment.utc().diff(moment(p.updated), 'minutes') > 15) {
            updated = yield player.updatePlayer.call(this, this.params.player);
        }
    } else {
        updated = yield player.updatePlayer.call(this, this.params.player);
    }
    // not in database, couldn't get from api. Throw error
    if(p.length === 0 && updated && updated.error){
        this.status = 400;
        this.body = updated;
        return;
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
});

app.get('/bulkPlayers/:players/', function*(next){
    var players = this.params.players.split(',');
    if(players.length > 50){
        this.throw(400);
    }
    players = _.map(players, function(n){
        return Number(n);
    });
    this.body = this.db.collection('players').find({account_id: {$in: players}}).stream().pipe(JSONStream.stringify());
    yield next;
});

app.get('/history/:player/:page/:mode/', function*(next) {
    var count = Number(this.params.page) * 25;
    var nickname = this.params.player;
    var p = yield player.lookupPlayerNickname.call(this, nickname);
    var updated;
    if (p.length === 1 && p[0].historyUpdated !== undefined) {
        p = p[0];
        if (moment.utc().diff(moment(p.historyUpdated), 'minutes') > 15) {
            updated = yield player.updateHistory.call(this, nickname);
        }
    } else {
        updated = yield player.updateHistory.call(this, nickname);
    }
    if (updated && !updated.error) {
        p = updated;
    }
    var sliced = _.slice(p[`${this.params.mode}_history`], count - 25, count);
    var lookup = yield match.lookup.call(this, sliced);
    var exists = _.pluck(lookup, 'id');
    var needs = _.difference(sliced, exists);
    if(needs.length >= 1){
        var added = yield match.multigrab.call(this, needs);
        if(added && !added.error){
            lookup = lookup.concat(added);
        }
    }
    this.body = {};
    this.body.account_id = p.account_id;
    this.body.matches = _.sortByOrder(lookup, 'id', false);
    yield next;
});

app.get('/match/:match/', function*(next){
    var m = yield match.lookup.call(this, [Number(this.params.match)]);
    if (m.length !== 1) {
        m = yield match.multigrab.call(this, [this.params.match]);
    }
    this.body = m[0];
    yield next;
});

app.get('/cache/:player/:mode/', function*(next) {
    var pid = Number(this.params.player);
    if(String(pid) !== this.params.player){
        this.status = 400;
        this.body = {error: 'User ID is not number.'};
        return;
    }
    var modes = {
        'rnk': 1,
        'cs': 2,
        'acc': 3
    };
    var mode = modes[this.params.mode];
    this.body = this.db.collection('matches').find({
        'players.player_id': pid,
        mode: mode
    }).stream().pipe(JSONStream.stringify());
    yield next;
});

app.get('/counts/', function*(next){
    var that = this;
    this.body = {};
    this.body.players = yield new Promise(function(resolve, reject) {
        that.db.collection('players').count(function(err, count){
            resolve(count);
        });
    });
    this.body.matches = yield new Promise(function(resolve, reject) {
        that.db.collection('matches').count(function(err, count){
            resolve(count);
        });
    });
    var short = moment.utc().subtract(15, 'minutes').toDate();
    this.body.apiSuccess = yield new Promise(function(resolve, reject) {
        that.db.collection('apilogger').find({
            date: {$gte: short},
            status: 200
        }).count(function(err, count){
            resolve(count);
        });
    });
    this.body.apiFail = yield new Promise(function(resolve, reject) {
        that.db.collection('apilogger').find({
            date: {$gte: short},
            status: {$ne: 200}
        }).count(function(err, count){
            resolve(count);
        });
    });
    var gtr = moment.utc().subtract(1, 'day').toDate();
    this.body.api = yield new Promise(function(resolve, reject) {
        that.db.collection('apilogger').find({
            date: {$gte: gtr},
        }).count(function(err, count){
            resolve(count);
        });
    });
    yield next;
});

app.get('/recentPlayers/', function*(next){
    this.body = this.db.collection('players').find({}, {nickname: 1}, {limit: 20}).sort({updated: -1}).stream().pipe(JSONStream.stringify());
    yield next;
});

app.get('/recentAPI/', function*(next){
    var gtr = moment.utc().subtract(1, 'day').toDate();
    this.body = this.db.collection('apilogger').find({date: {$gte: gtr}}, {_id: 0}).stream().pipe(JSONStream.stringify());
    yield next;
});

app.listen(config.port);

module.exports = app;
