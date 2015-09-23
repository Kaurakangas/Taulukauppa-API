var API = {};

function checkUID(uid) {
	if (uid.length !== 16) return;
	var r = child_process.execSync("/taulukauppa/luhn_uid " + uid);
	return r;
}

function APIException(message) {
	this.message = message;
	this.name = "APIException";
	this.toJSON = function() {
		return this;
	}
	this.toString = function() {
		return this.name+": "+this.message;
	}
//	console.error("APIException created", this);
}

/* binäärinen tarkistus onko summa arvolla N arvo N */
function isOnUserLevel(lvl, n) {
	return (lvl & n) === n;
}

/* Tämä pitää saada APIiin tai tietokantaan itseensä */
function handleUserLevel(lvl) {
	/* Joss taso enemmän kuin varmentautunut käyttäjä niin MYÖS varmentautunut käyttäjä */
	if (lvl >= userlevels.VERIFIED)
		if (!isOnUserLevel(lvl, userlevels.VERIFIED))
			lvl += userlevels.VERIFIED;

	/* Joss ADMIN tai DEVELOPER niin myös MODERATOR */
	if (isOnUserLevel(lvl, userlevels.ADMIN) || isOnUserLevel(lvl, userlevels.DEVELOPER))
		if (!isOnUserLevel(lvl, userlevels.MODERATOR))
			lvl += userlevels.MODERATOR;

	return lvl;
}

var userlevels = API.USRLVLS = {
/* toteutetaan tavuun koko käyttäjäkirjo eli 2^8 mahdollisuutta */
	UNREGISTERED: 0,	// 0	00000000
	NORMAL		: 1,	// 2^1	00000001
	VERIFIED	: 2,	// 2^2	00000010
	MODERATOR	: 4,	// 2^3	00000100
	ADMIN		: 8,	// 2^4	00001000
	DEVELOPER	: 16,	// 2^5	00010000

	ARTIST		: 32,	// 2^6	00100000
	CUSTOMER1	: 64,	// 2^7	01000000
	CUSTOMER2	: 128	// 2^8	10000000
};

Get = function(uid, token, sessiontoken) {
	return userlevels.DEVELOPER+userlevels.ADMIN;
}
function CallGet(target, query) {
	console.log("API:CallGet()", target, query);
	
//	throw new APIException("dumb");
};
Call = function(method, target, query) {
	console.log("API:call()", method, target, query);
	if (typeof method !== "string") throw new APIException("Method must be String");
	switch(method.toUpperCase()) {
		case "GET":
			return CallGet(target, query);
			break;
		default:
			throw new APIException("Method cannot recognize. ("+method+")");
	}
	throw new APIException("Internal API error. (method="+method+")");
};

Config = function(configurations) {
	API.config = configurations;
	return API;
}

module.exports = API;
module.exports.config = Config;
module.exports.call = Call;
module.exports.get = Get;
module.exports.APIException = APIException;
module.exports.get = CallGet;