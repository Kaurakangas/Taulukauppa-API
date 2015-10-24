var log    = require("./log.js");
var uidlib = require("./uid.js");

var db = require("./db.js"),
	API = {},
	userlevels = {
	/* toteutetaan tavuun koko käyttäjäkirjo eli 2^8 mahdollisuutta */
		UNREGISTERED: 0,	// 0	00000000
		NORMAL		: 1,	// 2^1	00000001
		VERIFIED	: 2,	// 2^2	00000010
		MODERATOR	: 4,	// 2^3	00000100
		ADMIN		: 8,	// 2^4	00001000
		DEVELOPER	: 16,	// 2^5	00010000

		ARTIST		: 32,	// 2^6	00100000
		CUSTOMER1	: 64,	// 2^7	0100000W0
		CUSTOMER2	: 128	// 2^8	10000000
	},	
	tokenlevels = {
		ACCESS_ALL_OWN	: 1,
		LIST_USERS		: 2,
		LIST_GROUPS		: 4,
		USER_DETAILS	: 8,

	},
	methods = {
		"GET": true
	},
	tokens = {};

function extend(obj, src) {
	for (var key in src) if (src.hasOwnProperty(key)) obj[key] = src[key];
	return obj;
}


function APIException(message) {
	if (message instanceof APIException) return this=message;
	this.message = message;
	this.name = "APIException";
	this.stack = new Error().stack;
	this.toJSON = function() {
		return this;
	}
	this.toString = function() {
		return this.name+": "+this.message;
	}
//	log.error("APIException created", this);
}

/* binäärinen tarkistus onko summa arvolla N arvo N */
function isOnUserLevel(lvl, n) {
	if (n === 0) return lvl === 0;
	return (lvl & n) === n;
}
function grantUserLevel(lvl, n) {
	return lvl+isOnUserLevel(lvl,n)?0:n;
}

/* Tämä pitää saada APIiin tai tietokantaan itseensä */
function handleUserLevel(lvl) {
	/* Joss taso enemmän kuin varmentautunut käyttäjä niin MYÖS varmentautunut käyttäjä */
	if (lvl >= userlevels.VERIFIED)
		lvl = grantUserLevel(lvl, userlevels.VERIFIED);

	/* Joss ADMIN tai DEVELOPER niin myös MODERATOR */
	if (isOnUserLevel(lvl, userlevels.ADMIN) || isOnUserLevel(lvl, userlevels.DEVELOPER))
		lvl = grantUserLevel(lvl, userlevels.MODERATOR);

	return lvl;
}

function getTokenMetaByToken(token, callback) {
	if (token in tokens) return callback(null, tokens[token]);

	return db.doSelect('SELECT * FROM tokens, now() WHERE token = $1;', [ token ], function(err, results) {
		if (err) return callback(err, results);
		if (results.rowCount != 1) return callback(new Error('getTokenMetaByToken: query get invalid number of rows: '+result.rowCount), result);
		var res = results.rows[0];
		tokens[res.token] = res;
		callback(null, res);
	});
}

function getTokenPermissionsByToken(token, callback) {
	return getTokenMetaByToken(token, function(err, meta) {
		callback(err, meta.permissions);
	});
}

var target_funcs = {
	"system": function(lvl, method, uid, query) {

//		toggledebug process.env.debug

	},
	"users": function(lvl, method, uid, query, callback) {
		log.out(method+":users", uid, query);
		switch (method) {
			case "GET":
				var querystr;

				if (uid) {
					if (uidlib.isValidOctet(uid, uidlib.idOctets.USERS))
						query_s = ['SELECT * FROM users WHERE uid = $1::uid LIMIT 1;', [ uid ]];
					else return callback(new Error('Invalid UID type'));
				} else query_s = ['SELECT * FROM users;', null];

				// Tehdään pyyntö käyttäjäkantaan, joko yhden tai jokaisen yksilön kohdalle
				return db.doSelect(query_s[0], query_s[1], function(err, results) {
					if (err) return callback(new APIException('SELECT/USERS Users not found (uid='+uid+')'), results);
					if (results.length == 0) return callback(new APIException('User not found (uid='+uid+')'), results);

					results = db.parse.select.users(results.rows, lvl);
					callback(null, results);
				});
			default:
				return callback(new APIException('Invalid Method'));
		}
	},
	"userdetails": function(lvl, method, uid, query, callback) {
		log.out(method+":userdetails", uid, query);
		if (!uidlib.looksLike(uid)) return callback(new TypeError("UID Must be set."))
		switch (method) {
			case "GET":
				if (uidlib.isValidOctet(uid, uidlib.idOctets.DETAILS)) {
					/* Tarkistetaanko viitataanko pelkkiin henkilötietoihin ... */

					return db.doSelect('SELECT * FROM details WHERE uid = $1::uid LIMIT 1;', [ uid ], function(err, results) {
						if (err) return callback(new APIException('SELECT/DETAILS Users not found (uid='+uid+')'), results);
						if (results.length == 0) return callback(new error('Details not found (uid='+uid+')'), results);
						results = db.parse.select.userdetails(results.rows, lvl);
						callback(err, results);
					});
				} else if (uidlib.isValidOctet(uid, uidlib.idOctets.USERS)) {
					/* ... vai käyttäjän tietoihin ne sisältäen */

					return db.doSelect('SELECT * FROM users, details WHERE details_uid=details.uid AND users.uid=$1::uid LIMIT 1;', [ uid ], function(err, results) {
						if (err) return callback(new APIException('SELECT/USERDETAILS Users not found (uid='+uid+')'), results);
						if (results.length == 0) return callback(new error('Details not found (uid='+uid+')'), results);
						results = db.parse.select.users(results.rows, lvl);
						results = db.parse.select.userdetails(results, lvl);
						callback(err, results);
					});
				} else {
					/* Muulloin toimitaan käyttäjän oikeuksien rajoissa */
					return callback(new Error('Not valid UID ('+uid+')'));
				}
			default:
				return callback(new APIException('Invalid Method'));
		}
	}
};

function Call(method, target, uid, query, callback) {
	if (!!API.NO_CONFIG) throw new APIException("API not configured");
	log.out("API::Call()", method, target, query);
	if (typeof method !== "string")
		throw new APIException("Method must be String");
	if (typeof target !== "string")
		throw new APIException("Target must be String");

	target = target.toLowerCase();
	method = method.toUpperCase();
	callback = (typeof callback === "function") ? callback : function(){};

	if (typeof methods[method] === "undefined")
		throw new APIException("Method cannot recognize. ("+method+")");

	var token = (typeof query.token === "undefined") ? false : query.token,
		lvl = token ? getTokenPermissionsByToken(token) : 0,
		RunCall = (function(target){		
			if (typeof target_funcs[target] !== "function")
				throw new APIException("Target cannot recognize. ("+target+")");

			log.out("RunCall to '"+target+"' selected");
			return target_funcs[target];
		})(target);

	return RunCall(lvl, method, uid, query, callback);


//	throw new APIException("Internal API error. (target="+target+",method="+method+")");
};


Config = function(pg_db, resources, configurations) {
	db            = pg_db;
	API.resources = resources;
	API.config    = configurations;
	API.NO_CONFIG = false;
	
	return API;
}
module.exports = API;
module.exports.config = Config;
module.exports.call = Call;
module.exports.APIException = APIException;