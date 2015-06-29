'use strict';

require('newrelic');
var koa = require('koa.io');
var logger = require('koa-logger');
var cors = require('kcors');
var moment = require('moment');
var _ = require('lodash-node');
var route = require('koa-route');
var JSONStream = require('JSONStream');
var ratelimit = require('koa-ratelimit');
var redis = require('redis');
var MongoClient = require('mongodb').MongoClient;
var gm = require('gm').subClass({
    imageMagick: true
});

import player from './src/player';
import match from './src/match';
import config from './config';

var app = koa();
app.proxy = true;
var db = new Promise(function(resolve) {
    MongoClient.connect(config.db, {
        server: {
            poolSize: 15
        },
        native_parser: true,
        auto_reconnect: true
    }, function(err, database) {
        resolve(database);
    });
});


app.use(ratelimit({
    db: redis.createClient(),
    duration: 900000,
    max: 100,
    id: function(context) {
        return context.ip;
    }
}));
if (config.debug) {
    app.use(logger());
}
app.use(cors());
app.use(function* mongopool(next) {
    this.db = yield db;
    yield next;
});

// json middleware
app.use(function*(next) {
    this.type = 'json';
    yield next;
});

app.use(route.get('/player/:player', function*(playerName, next) {
    let updated;
    let exclude = {
        rnk_history: 0,
        cs_history: 0,
        acc_history: 0,
        rnk_history_updated: 0,
        cs_history_updated: 0,
        acc_history_updated: 0,
        _id: 0
    };
    let Player = new player(this.db, playerName);
    let p = yield Player.lookupPlayerNickname(exclude);
    if (p.length === 1) {
        p = p[0];
        if (moment.utc().diff(moment(p.updated), 'minutes') > 15) {
            updated = yield Player.updatePlayer(this.request.ip, this.app.io);
        }
    } else {
        updated = yield Player.updatePlayer(this.request.ip, this.app.io);
    }
    // not in database, couldn't get from api. Throw error
    if (p.length === 0 && updated && updated.error) {
        this.status = 400;
        this.body = updated;
    }
    if (updated && !updated.error) {
        this.app.io.emit('update', {
            nickname: updated.nickname
        });
        p = updated;
    }
    this.body = p;
    // alert user that data is old
    if (updated && this.body !== updated) {
        this.body.fallback = true;
    }
    yield next;
}));

app.use(route.get('/bulkPlayers/:players', function*(playerList, next) {
    let players = playerList.split(',');
    if (players.length > 50) {
        this.throw(400);
    }
    players = players.map(Number);
    let exclude = {
        rnk_history: 0,
        cs_history: 0,
        acc_history: 0,
        rnk_history_updated: 0,
        acc_history_updated: 0,
        cs_history_updated: 0,
        _id: 0
    };
    this.body = this.db.collection('players').find({
        account_id: {
            $in: players
        }
    }, exclude).stream().pipe(JSONStream.stringify());
    yield next;
}));


app.use(route.get('/history/:player/:page/:mode', function*(playerName, page, mode, next) {
    let count = Number(page) * 25;
    let Player = new player(this.db, playerName);
    let p = yield Player.lookupPlayerNickname();
    let updated;
    if (p.length === 1 && p[0][`${mode}_history_updated`] !== undefined) {
        p = p[0];
        if (moment.utc().diff(moment(p[`${mode}_history_updated`]), 'minutes') > 15) {
            updated = yield Player.updateHistory(mode, this.request.ip, this.app.io);
        }
    } else {
        updated = yield Player.updateHistory(mode, this.request.ip, this.app.io);
    }
    if (updated && !updated.error) {
        p = updated;
    }
    if (updated && updated.error) {
        p = {
            account_id: p.player_id || 0
        };
        p[`${mode}_history`] = p[`${mode}_history`] || [];
    }
    p[`${mode}_history_updated`] = moment.utc().toDate();
    this.db.collection('players').update({
        nick: playerName.toLowerCase()
    }, {
        $set: p
    }, {
        upsert: true
    });
    let sliced = _.slice(p[`${mode}_history`], count - 25, count);
    let Match = new match(this.db);
    let lookup = yield Match.lookup(sliced);
    let exists = _.pluck(lookup, 'id');
    let needs = _.difference(sliced, exists);
    if (needs.length >= 1) {
        let added = yield Match.multigrab(needs, this.request.ip, this.app.io);
        if (added && !added.error) {
            lookup = lookup.concat(added);
        }
    }
    this.body = {};
    this.body.history = _.sortByOrder(lookup, 'id', false);
    this.body.account_id = p.account_id;
    yield next;
}));

app.use(route.get('/match/:match', function*(matchID, next) {
    let Match = new match(this.db);
    let m = yield Match.lookup([Number(matchID)]);
    if (m.length !== 1) {
        m = yield Match.multigrab([matchID], this.request.ip, this.app.io);
    }
    this.body = m[0];
    yield next;
}));

app.use(route.get('/cache/:player/:mode', function*(playerID, mode, next) {
    let pid = Number(playerID);
    if (String(pid) !== playerID) {
        this.status = 400;
        this.body = {
            error: 'User ID is not number.'
        };
    }
    let modes = {
        'rnk': 1,
        'cs': 2,
        'acc': 3
    };
    this.body = this.db.collection('matches').find({
        'players.player_id': pid,
        mode: modes[mode]
    }, {
        _id: 0
    }).sort({
        'id': -1
    }).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/counts', function*(next) {
    let apilogger = this.db.collection('apilogger');
    let matches = this.db.collection('matches');
    let players = this.db.collection('players');
    this.body = {};
    this.body.players = yield new Promise(function(resolve) {
        players.count(function(err, count) {
            resolve(count);
        });
    });
    this.body.matches = yield new Promise(function(resolve) {
        matches.count(function(err, count) {
            resolve(count);
        });
    });
    let short = moment.utc().subtract(15, 'minutes').toDate();
    this.body.apiSuccess = yield new Promise(function(resolve) {
        apilogger.find({
            date: {
                $gte: short
            },
            status: 200
        }).count(function(err, count) {
            resolve(count);
        });
    });
    this.body.apiFail = yield new Promise(function(resolve) {
        apilogger.find({
            date: {
                $gte: short
            },
            status: {
                $ne: 200
            }
        }).count(function(err, count) {
            resolve(count);
        });
    });
    let gtr = moment.utc().subtract(1, 'day').toDate();
    this.body.api = yield new Promise(function(resolve) {
        apilogger.find({
            date: {
                $gte: gtr
            },
        }).count(function(err, count) {
            resolve(count);
        });
    });
    yield next;
}));

app.use(route.get('/recentPlayers', function*(next) {
    this.body = this.db.collection('players').find({}, {
        nickname: 1
    }, {
        limit: 20
    }).sort({
        updated: -1
    }).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/recentMatches', function*(next) {
    let gtr = moment.utc().subtract(12, 'hours').toDate();
    this.body = this.db.collection('matches').find({
        date: {
            $gte: gtr
        }
    }, {
        _id: 0
    }).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/newestMatch', function*(next) {
    this.body = this.db.collection('matches').find({}, {
        id: 1,
        _id: 0
    }).sort({
        'id': -1
    }).limit(1).stream().pipe(JSONStream.stringify());
    yield next;
}));

app.use(route.get('/banner/:player', function*(playerName, next) {
    this.type = 'image/png';
    let Player = new player(this.db, playerName);
    let p = yield Player.lookupPlayerNickname({
        nickname: 1,
        rnk_wins: 1,
        rnk_losses: 1,
        rnk_amm_team_rating: 1
    });
    if (p.length === 1) {
        p = p[0];
        let mmr = Math.round(p.rnk_amm_team_rating);
        let win = p.rnk_wins;
        let loss = p.rnk_losses;
        this.body = yield new Promise(function(resolve) {
            gm(400, 60, '#121212')
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
                .toBuffer('PNG', function(err, buffer) {
                    resolve(buffer);
                });
        });
    }
    yield next;
}));

app.listen(config.port);