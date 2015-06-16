honbot-server [![Dependency Status](https://david-dm.org/scttcper/honbot-server.svg)](https://david-dm.org/scttcper/honbot-server)
=============
honbot is a [Heroes of Newerth (HoN)](http://www.heroesofnewerth.com/) statistics website for the [HoN API](http://api.heroesofnewerth.com/).

This repository contains the backend for honbot. The frontend can be found in [honbot-client](https://github.com/scttcper/honbot-client).

##Requirements
mongodb  
redis  
iojs or node  


##Installation
```bash
clone the repo
setup config.js. Check config.example.js
npm install
node server.js
```


## Indexes
Add these to speed things up
```javascript
db.players.ensureIndex({'account_id': 1}, {unique: true});
db.players.ensureIndex({'nick': 1}, {unique: true});
db.matches.ensureIndex({'mode': 1});
db.matches.ensureIndex({'id': 1}, {unique: true});
db.createCollection('apilogger', {max: 50000});
db.apilogger.ensureIndex({'status': 1});
db.apilogger.ensureIndex({'date': 1});
```