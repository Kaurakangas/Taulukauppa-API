console.log("System::START");

var http    = require('http');
var https   = require('https');
var express = require('express');
var fs      = require('fs');
var api     = require('./api.js');
var secure  = require('./secure.js');
var app     = express();

var APIException = api.APIException;

var config = JSON.parse(fs.readFileSync("config.json", "utf8"));
api.config(config);
console.log("System::Configured!");

var PORT  = config.server.port || 8081;
var HOST  = config.server.host || "127.0.0.1";
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
	else opt.host = HOST;

	if (typeof cfg.port === "string" || typeof cfg.port === "number")
		opt.port = parseInt(cfg.port);
	else return;

	opt.server = https.createServer(opt, app);

	return opt;
})(config.server.https);

console.debug = function( val ) {
	if (DEBUG == false) return;
	console.log( val );
}

app.get('/', function(req, res) {
	res.redirect("http://"+api.WWWServiceHost+":"+api.WWWServicePort+"/");
});
app.get('/api/doc', function(req, res) {
	res.sendFile(__dirname + "/public/documentation.html");
});



app.get('/api', function(req, res) {
	res.redirect("/api/doc");
});
app.all('/api/:target', function(req, res) {
	console.log("HTTP:"+req.method.toUpperCase(), req.params, req.query);
	var query = req.query,
		params = req.params,
		target = params.target,
		method = req.method;

	res.type('application/vnd.api+json');
	try {
		if (typeof query.method !== "undefined") method = query.method;

		response = api.call(method.toUpperCase(), target.toLowerCase(), query);
		if (!response) throw new Exception("Empty response from API.call");
		res.send({
			"query"   : query,
			"response": response
		});
	} catch(e) {
		if (e instanceof APIException) {
			console.error("APIException while call:", e);
			res.status(e.httpstatus || 500).send(e);
		} else {
			console.error("Unindetified error while API call", e);
			res.status(e.httpstatus || 500).send({
				ERROR: "Exception",
				Exception: e
			});
		}
	}	
});

try {
	app.listen(PORT, HOST);
	console.log("System::HTTP Server running at "+HOST+":"+PORT);
} catch(e) {
	console.error("System::Error while starting to listen HTTP "+HOST+":"+PORT)
	console.error(e);
}

if (HTTPS) {
	try {
		HTTPS.server.listen(HTTPS.port, HTTPS.host);
		console.log("System::SSL server running at "+HTTPS.host+":"+HTTPS.port);
	} catch(e) {
		console.error("System::Error while starting to listen HTTPS "+HOST+":"+PORT)
		console.error(e);
	}
}

