console.log("System::START");

var http    = require('http');
var express = require('express');
var app     = express();

var api = require('./api.js');

var PORT = 8080;
var HOST = "127.0.0.1";

var APIException = api.APIException;

app.all('/api', function(req, res){
	var query = req.query;
	try {
		response = api.call(req.method, query);
		res.send(response);
	} catch(e) {
		if (e instanceof APIException) {
			console.error("APIException while call:", e);
			res.status(500).json(e);
		} else {
			console.error("Unindetified error while API call");
			console.error({"ERROR":"Unindetified exception","Exception":e});
			res.status(500).json({"ERROR":"Exception","Exception":e});
		}
	}	
});

app.listen(PORT, HOST);

console.log("System::Server running at "+HOST+":"+PORT);