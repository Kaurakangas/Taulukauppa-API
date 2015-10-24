var log    = require("./log.js");
var uidlib = require("./uid.js");

var API = {},
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


function APIException(message, httpCode) {
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
	this.httpCode = httpCode || 500;
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

function getTokenMetaByToken(db, token, callback) {
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

function Call(db, method, req_params, query, callback) {
	if (!!API.NO_CONFIG) throw new APIException("API not configured");
	log.out("API_V1 CALL", method, req_params, query);

	var values = [], q;

	switch(method.toUpperCase()) {
		case "GET":
			q = "SELECT "+req_params.cols.join(" , ")
				+" FROM "+req_params.tables.join(" , ")
				+((req_params.where.length>0)?(" WHERE "+req_params.where.join(" AND ")):"")
				+((req_params.sort.length>0)?(" ORDER BY "+req_params.sort.join(" , ")):"")
				+((!!req_params.limit)?(" LIMIT "+req_params.limit):"")+";";
			break;
		default: return callback(new APIException("Method cannot recognize. ("+method+")"));
	}

	try {
		db.doSelect(q, values, function(e, r){
			callback(e, r);
		});
	} catch (e) {
		log.error("Error while running DB query "+q);
		log.error(e);
		log.stacktrace(e);
	}
};


Config = function(pq_db, resources, configurations) {
	API.resources = resources;
	API.config    = configurations;
	API.NO_CONFIG = false;

	log.debug("INITED API v1");

	return API;
}
module.exports = API;
module.exports.config = Config;
module.exports.call = Call;
module.exports.APIException = APIException;