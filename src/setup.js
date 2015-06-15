var mongo = require('mongodb').MongoClient;
var config = require('../config');

mongo.connect(config.db, function(err, db) {
    db.collection('players').ensureIndex({'account_id': 1}, {unique: true}, function(){
        db.collection('players').ensureIndex({'nick': 1}, {unique: true}, function(){
            db.collection('matches').ensureIndex({'players.player_id': 1}, function(){
                db.collection('matches').ensureIndex({'mode': 1}, function(){
                    db.collection('matches').ensureIndex({'id': 1}, {unique: true}, function(){
                        db.createCollection('apilogger', {max: 50000}, function(){
                            db.collection('apilogger').ensureIndex({'status': 1}, function(){
                                db.collection('apilogger').ensureIndex({'date': 1}, function(){
                                    db.close();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

});