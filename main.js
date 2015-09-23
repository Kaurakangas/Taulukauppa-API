console.log("System::START");

var http    = require('http');
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

if (!HOST) app.listen(PORT);
else       app.listen(PORT, HOST);

console.log("System::Server running at "+(!HOST?"localhost":HOST)+":"+PORT);