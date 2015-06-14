var mongo = require('mongodb').MongoClient;
var config = require('../config');

mongo.connect(config.db, function(err, db) {
    var players = db.collection('players');
    var matches = db.collection('matches');
    players.ensureIndex({'nick': 1, 'account_id': 1}, {unique: true}, function(){
        matches.ensureIndex({'players.player_id': 1, 'mode': 1}, function(){
            matches.ensureIndex({'id': 1}, {unique: true}, function(){
                db.createCollection('apilogger', {max: 50000}, function(){
                    db.collection('apilogger').ensureIndex({'status': 1, 'date': 1}, function(){
                        db.close();
                    });
                });
            });
        });
    });

});