var uidlib = require("./uid.js");

var db,
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



function APIException(message) {
	this.message = message;
	this.name = "APIException";
	this.stack = new Error().stack;
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
		grantUserLevel(lvl, userlevels.VERIFIED);

	/* Joss ADMIN tai DEVELOPER niin myös MODERATOR */
	if (isOnUserLevel(lvl, userlevels.ADMIN) || isOnUserLevel(lvl, userlevels.DEVELOPER))
		grantUserLevel(lvl, userlevels.MODERATOR);

	return lvl;
}

function getTokenMetaByToken(token) {
	var query = db.query('SELECT * FROM tokens WHERE token = $1::varchar(32)', [ token ]);
	query.on('row')
	return query;
}
function getTokenPermissionsByToken(token) {
	if (token in tokens) {
		return tokens[token].permissions;
	}
	var meta = getTokenMetaByToken(token);
	return 0;
}

var default_callback_func = function(response, err) {
	callback
};

var target_funcs = {
	"system": function(lvl, method, uid, query) {

	},
	"users": function(lvl, method, uid, query) {
		if (uidlib.isValid(uid, '81')) {
			/* Joss annettu uid on validi, niin pyydetään vain tietyn käyttäjän rivi */



		} else {
			/* ... muulloin kaikki rivit */



		}
	},
	"userDetails": function(lvl, method, uid, query) {
		if (!uidlib.isValid(uid)) throw new Error('Not valid UID ('+uid+')');


	}
};

function Call(method, query, target, uid, callback) {
	console.log("API::Call()", method, target, query);
	if (typeof method !== "string")
		throw new APIException("Method must be String");
	if (typeof target !== "string")
		throw new APIException("Target must be String");

	target = target.toLowerCase();
	method = method.toUpperCase();
	callback = (typeof callback === "function")?callback:default_callback_func;

	var RunCall = target_funcs[target];
	if (typeof RunCall !== "function")
		throw new APIException("Target cannot recognize. ("+target+")");

	if (typeof methods[method] === "undefined")
		throw new APIException("Method cannot recognize. ("+method+")");

	{
		var token = (typeof query.token === "undefined") ? false : query.token;
		var lvl = token?getTokenPermissionsByToken(token):0;

		console.log(getTokenMetaByToken("asd"));

		return RunCall(lvl, method, uid, query);
	}

	callback();


	throw new APIException("Internal API error. (target="+target+",method="+method+")");
};

Config = function(pg_db, configurations) {
	db = pg_db;
	API.config = configurations;
	return API;
}
module.exports = API;
module.exports.config = Config;
module.exports.call = Call;
module.exports.APIException = APIException;
module.exports.getVersion = function(version) {
	switch(version) {
		case 'v0':
			return this;
		default:
			throw new APIException("Version "+version+" is undefined.");
	}
	return undefined;
};
