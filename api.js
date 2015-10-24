var log    = require("./log.js");
var uidlib = require("./uid.js");
var jsonapi_lib = require("./resource_jsonapi.js");

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

function getTokenPermissionsByToken(token, callback) {
	return getTokenMetaByToken(token, function(err, meta) {
		callback(err, meta.permissions);
	});
}



Config = function(resources, configurations) {
	API.resources = resources;
	API.config    = configurations;
	API.versions  = {};
	for(version in API.config.apiversions) {
		log.debug("Handling API version "+version, API.config.apiversions[version]);
		try {
			API.versions[version] = require(API.config.apiversions[version]);
			API.versions[version].config(resources, configurations);
		} catch(e) {
			log.error("Error while initializing API version "+version+" from file "+API.config.apiversions[version], e);
			log.stacktrace(e);
		}
	}
	API.NO_CONFIG = false;

	return API;
}
module.exports = API;
module.exports.config = Config;
module.exports.APIException = APIException;
module.exports.getVersion = function(version) {
	if (!!API.NO_CONFIG) throw new APIException("API not configured");
	log.debug("Selecting API version "+version);
	if (!!API.versions[version]) {
		return API.versions[version];
	} else throw new APIException("Version "+version+" is undefined.");

	return undefined;
};

module.exports.jsonapi_set_resources = jsonapi_lib.jsonapi_set_resources_func;
module.exports.jsonapi_gen = jsonapi_lib.jsonapi_gen_func;