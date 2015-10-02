console.log("System::START");

var http     = require('http');
var https    = require('https');
var express  = require('express');
var fs       = require('fs');
var postgres = require('pg');
// #var passport = require('passport');

var api      = require('./api.js');
var secure   = require('./secure.js');

var app      = express();
var config   = JSON.parse(fs.readFileSync("config.json", "utf8"));
var db;

try {
	config.postgresql.conString = "postgres://"+config.postgresql.username+":"+config.postgresql.password+"@"+config.postgresql.server+":"+config.postgresql.port+"/"+config.postgresql.masterDB;
	db = new postgres.Client(config.postgresql.conString);
	db.connect();
} catch(e) {
	console.error("System::ERROR FATAL while connecting to database:", pg_con_string);
	console.error(e);
	return;
}
config.apipath_root = config.apipath;
config.apipath_n_version = (config.apipath==''?'':('/'+config.apipath))+"/"+config.apiversion;

var APIException = api.APIException;
api.config(db, config);

process.env.http_port = config.server.port || 8081;
process.env.http_host = config.server.host || "127.0.0.1";
var DEBUG = config.debug || false;
var HTTPS = (function(cfg){
	var opt = {};
	if (typeof cfg === "undefined") return;

	if (typeof cfg.key === "string")
		opt.key = fs.readFileSync(cfg.key);
	else return;

	if (typeof cfg.cert === "string")
		opt.cert = fs.readFileSync(cfg.cert);
	else return;

	if (typeof cfg.host === "string")
		opt.host = cfg.host;
	else opt.host = process.env.http_host;

	if (typeof cfg.port === "string" || typeof cfg.port === "number")
		opt.port = parseInt(cfg.port);
	else return;

	opt.server = https.createServer(opt, app);

	return opt;
})(config.server.https);
console.log("System::Configured!");

console.debug = function( val ) {
	if (DEBUG == false) return;
	console.log( val );
}

app.all("*", function(req, res, next) {
	console.log("HTTP"+(req.secure?'S':'')+"::"+req.method.toUpperCase(), req.params, req.query);
	next();
});

app.get(config.apipath+'/doc', function(req, res) {
	res.sendFile(__dirname + "/public/documentation.html");
});

app.all(config.apipath+'/:version/:target/(:uid)?', function(req, res) {
	var query   = req.query,
		params  = req.params,
		method  = (typeof query.method === "undefined")?req.method:query.method;

	res.type('application/vnd.api+json');
	try {

		api.getVersion(params.version).call(method, params.target, params.uid, query, function(err, response) {
			if (!response) throw new Error("Empty response from API.call");

			if (err) {
				throw new APIException(err);
			} else {
				res.send({
					"query"   : query,
					"response": response
				});
			}
		});

	} catch(e) {
		res.status(e.httpstatus || 500).send((function(e){
			if (e instanceof APIException) {
				console.error("APIException while call:", e.toString());
			} else {
				console.error("Unindetified error while API call", e);
				e = { "ERROR": "Exception", "Exception": e, "stack": e.stack };
			}
			console.error(e.stack);
			return e;
		})(e));
	}	
});

try {
	app.listen(process.env.http_port, process.env.http_host);
	console.log("System::HTTP Server running at "+process.env.http_host+":"+process.env.http_port);
} catch(e) {
	console.error("System::Error while starting to listen HTTP "+process.env.http_host+":"+process.env.http_port)
	console.error(e);
}

if (HTTPS) {
	try {
		HTTPS.server.listen(HTTPS.port, HTTPS.host);
		console.log("System::SSL server running at "+HTTPS.host+":"+HTTPS.port);
	} catch(e) {
		console.error("System::Error while starting to listen HTTPS "+HTTPS.host+":"+HTTPS.port)
		console.error(e);
	}
}

