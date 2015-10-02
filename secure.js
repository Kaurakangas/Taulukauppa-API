var crypto = require('crypto');
var base64 = require('base64');

var PBKDF2 = {
	"HASH_ALGORITHM"  : "sha256",
	"ITERATIONS"      : 1000,
	"HASH_BYTE_SIZE"  : 24,
	"SALT_BYTE_SIZE"  : 24
};
var HASH = {
	"SECTIONS"        : 4,
	"ALGORITHM_INDEX" : 0,
	"ITERATION_INDEX" : 1,
	"SALT_INDEX"      : 2,
	"PBKDF2_INDEX"    : 3
};

var pbkdf2_master_func = crypto.pbkdf2Sync;// || function(passwd, salt, iterations, key_length, algorithm) { };
	rand_master_func   = crypto.randomBytes,
	base64_decode      = base64.decode || function(str) { return new Buffer(str, "base64").toString(); },
	base64_encode      = base64.encode || function(str) { return new Buffer(str).toString("base64"); };

function const_time_str_equals(a, b) {
	if (!(typeof a === "string" &&  typeof b === "string"))
		throw new Error("const_time_str_equals: arguments must be typeof string");
	var alen = a.length, blen = b.length, diff = alen ^ blen;
	for( var i = 0; i < alen && i < blen; i++ )
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
};

function const_time_buf_equals(a, b) {
	var alen = a.length, blen = b.length, diff = alen ^ blen;
//	console.log(typeof a, a);
//	console.log(typeof b, b);
	for( var i = 0; i < alen && i < blen; i++ )
		diff |= a.readUInt8(i) ^ b.readUInt8(i);
	return diff === 0;
};

function create_pwd_hash(passwd) {
    // format: algorithm:iterations:salt:hash
    var salt = base64_encode(rand_master_func(PBKDF2.HASH_BYTE_SIZE));

    return PBKDF2.HASH_ALGORITHM + ":" + PBKDF2.ITERATIONS + ":" +  salt + ":" +
        base64_encode(pbkdf2(
            PBKDF2.HASH_ALGORITHM,
            passwd,
            salt,
            PBKDF2.ITERATIONS,
            PBKDF2.HASH_BYTE_SIZE,
            true
        ));
};

function pbkdf2(algorithm, passwd, salt, iterations, key_length, raw_output) {
	raw_output = raw_output || false;
    algorithm = algorithm.toLowerCase();

//    console.log("pbkdf2", passwd, salt, iterations, key_length, raw_output);

    var key = pbkdf2_master_func(passwd, salt, iterations, key_length, algorithm);0
//    console.log(key);

	return key;
}

function validate_password(passwd, correct_hash) {
    var params = correct_hash.split(":");
    if(params.length < HASH.SECTIONS) return false;

    var pbkdf2_corr_buf = new Buffer(params[HASH.PBKDF2_INDEX], "base64"),
    	pbkdf2_comp_buf = pbkdf2(
            params[HASH.ALGORITHM_INDEX],
            passwd,
            params[HASH.SALT_INDEX],
            parseInt(params[HASH.ITERATION_INDEX]),
            pbkdf2_corr_buf.length,
            true
        );

    return const_time_buf_equals(
        pbkdf2_corr_buf,
        pbkdf2_comp_buf
    );
}

module.export = {
	random  : rand_master_func,
	password: {
        validate    : validate_password,
        create_hash : create_pwd_hash
    }
};