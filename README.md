honbot-server [![Dependency Status](https://david-dm.org/scttcper/honbot-server.svg)](https://david-dm.org/scttcper/honbot-server)
=============
honbot is a [Heroes of Newerth (HoN)](http://www.heroesofnewerth.com/) statistics website for the [HoN API](http://api.heroesofnewerth.com/).

This repository contains the backend for honbot. The frontend can be found in [honbot-client](https://github.com/scttcper/honbot-client).

##Requirements
mongodb  
redis  
iojs or very latest node
npm


##Installation
```bash
clone the repo
setup config.js. Check config.example.js
npm install
npm install -g babel
npm run start
```
for servers ```forever start -c "babel-node" server.js```


## Indexes
Add these to speed things up
```javascript
db.players.ensureIndex({'account_id': 1}, {unique: true});
db.players.ensureIndex({'nick': 1}, {unique: true});
db.players.ensureIndex({'updated': 1});
db.matches.ensureIndex({'mode': 1});
db.matches.ensureIndex({'date': 1});
db.matches.ensureIndex({'id': 1}, {unique: true});
db.matches.ensureIndex({'players.player_id': 1});
db.createCollection('apilogger', {max: 50000});
db.apilogger.ensureIndex({'status': 1});
db.apilogger.ensureIndex({'date': 1});
```