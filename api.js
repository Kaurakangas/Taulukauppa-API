var userlevels;


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

function CallGet(target, query) {
	console.log("API:CallGet()", target, query);
	return {};
//	throw new APIException("dumb");
};

module.exports.USRLVLS = userlevels = {
/* toteutetaan tavuun koko käyttäjäkirjo eli 2^8 mahdollisuutta */
	UNREGISTERED: 0,
	NORMAL		: 1,
	VERIFIED	: 2,
	MODERATOR	: 4,
	ADMIN		: 8,
	DEVELOPER	: 16,
/* ------------ */
	ARTIST		: 32,
	CUSTOMER1	: 64,
	CUSTOMER2	: 128
};

module.exports.get = function(uid, token, sessiontoken) {
	/*00000000    0	Satunnainen selaaja                        UNERGISTERED
	  00000001    1	Normaali käyttäjä                          NORMAL
	  00000010    2	Verifioitu käyttäjä                        VERIFIED
	  00000100    4	Moderaattori                               MODERATOR
	  00001000    8	Ylläpitäjä                                 ADMIN
	  00010000   16	Kehittäjä                                  DEVELOPER
	  00100000   32	Taiteilija                                 ARTIST
	  01000000   64	Asiakas (painonapit)                       CUSTOMER1
	  10000000  128	Asiakas (galleristi [verkkosivu ostettu])  CUSTOMER2
	*/
	return userlevels.DEVELOPER+userlevels.ADMIN;
}

function isOnUserLevel(lvl, n) {
	return (lvl & n) === n;
}

module.exports.call = function(method, target, query) {
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


module.exports.APIException = APIException;
module.exports.get = CallGet;