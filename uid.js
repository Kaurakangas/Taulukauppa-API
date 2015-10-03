/* 
 * UID-käytännön hallitsemiseen kirjasto
 * 
 */

var idOctets = {
	'80': {'desc':''},
	'81': {'desc':''},
	'82': {'desc':''},
	'83': {'desc':''},
	'84': {'desc':''},
	'85': {'desc':''},
	'86': {'desc':''},
	'87': {'desc':''},
	'88': {'desc':''},

	'8A': {'desc':''},
	'8B': {'desc':''},
	'8C': {'desc':''},
	'8D': {'desc':''},

	'90': {'desc':''},

	'92': {'desc':''},
	'93': {'desc':''},

	'A0': {'desc':''},
	'A8': {'desc':''},

	'B0': {'desc':''},
	'B1': {'desc':''},

	USERS   : '81',
	DETAILS : '88',

	isValid: function(octet) {
		var i = parseInt(octet, 16);
		return i >= 128 && i < 191;
	}
};

var child_process = require('child_process');

function looksLikeUID(uid) {
	if (typeof uid !== "string") return false;
	if (uid.length != 16) return false;
	return true;
}

function isValidUIDOctet(uid, octet) {
	console.log("isValidUIDOctet("+uid+","+octet+")");
	return uid.substring(0,2) == octet;
}

function isValidUID(uid, octet) {
	console.log("isValidUID("+uid+", "+octet+")");
	if (typeof uid !== "string" || uid.length != 16)
		throw new TypeError("uid must be 16 hex long string");

	if (typeof octet !== "undefined")
		if (!isValidIDOctet(uid, octet)) return false;

	try {
		var a = child_process.execSync('/taulukauppa/validate_uid '+uid, { });
	} catch(e) {
		return false;
	}
	return true;
}

function validateUID(uid, octet, callback) {
	if (typeof uid !== "string" || uid.length != 16)
		throw new TypeError("uid must be 16 hex long string");

	if (typeof octet === "function") callback = octet;
	else if (typeof octet !== "undefined")
			if (!isValidIDOctet(uid, octet)) return false;

	try {
		return child_process.exec('/taulukauppa/validate_uid '+uid, { },
			function(err){
				if (err) throw new Error('UIDError: uid invalid');
				else callback();
			});
	} catch(e) {
		console.error(e, e.stack);
	}
}

function checkUIDHash(uid) {
	if (uid.length !== 16) return;
	var r = child_process.execSync("/taulukauppa/luhn_uid " + uid);
	return r;
}


module.exports.looksLike    = looksLikeUID;
module.exports.idOctets     = idOctets;
module.exports.isValid      = isValidUID;
module.exports.isValidOctet = isValidUIDOctet;
module.exports.validate     = validateUID;