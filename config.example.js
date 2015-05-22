
var config = {};

// mongo database connection
config.db = 'mongodb://localhost/hb';

// API TOKEN from api.heroesofnewerth.com
config.token = 'TOKENHERE';

// port for the server to start on
config.port = 5000;

// true / false depending on what you want
config.debug = true;

module.exports = config;