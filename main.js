var http     = require('http');
var https    = require('https');
var express  = require('express');
var fs       = require('fs');
// #var passport = require('passport');

var log      = require('./log.js'),
    api      = require('./api.js'),
    secure   = require('./secure.js'),
    db       = require('./db.js');

log.system("START");

var app       = express();
var config    = JSON.parse(fs.readFileSync("config.json", "utf8"));
var resource_lib  = require('./resources.js'),
	resources     = resource_lib.parse(require('/taulukauppa/api_request_datatree.js')),
	resource_tree = resource_lib.build_tree(resources);


try {
	db.build(config.postgresql);
	db.run();
} catch(e) {
	log.fatal("while connecting to database", config.postgresql.conString);
	log.error(e);
	return;
}

config.apipath_root = config.apipath;
config.apipath_n_version = (config.apipath==''?'':('/'+config.apipath))+"/"+config.apiversion;

var APIException = api.APIException;
api.config(db, resources, config);

process.env.http_port = config.server.port || 8081;
process.env.http_host = config.server.host || "127.0.0.1";
process.env.debug = config.debug || false;
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
log.system("Configured!");

app.all("*", function(req, res, next) {
	log.out("HTTP"+(req.secure?'S':'')+"::"+req.method.toUpperCase(), req.params, req.query);
	next();
});

app.get(config.apipath+'/doc', function(req, res) {
	res.sendFile(__dirname + "/public/documentation.html");
});

app.all(/^\/(v\d)(?:\/(.*))/, function(req, res, next) {
	log.out("HTTP request", req["_raw"], req.params);
	var request_version  = req.params[0],
		request_resource = '/'+(req.params[1] || ''),
		query   = req.query,
		method  = (typeof query.method === "undefined")?req.method:query.method;
	log.out("REGEXP CALL", request_version, request_resource);

	try {
		var res_req        = resource_lib.parse_request(request_resource),
		    res_req_params = resource_lib.get_sql_query_params(resources, res_req);

		api.getVersion(request_version).call(method, res_req_params, req.query, function(err, respond){
			log.debug("running response lambda", err, respond);
			if (!!err) {
				log.error(err);
				res.send(err);
				return;
			}

			res.send(respond);




		});
	} catch (e){
		log.fatal(e);
		res.send(e);
	}
});

app.all(config.apipath+'/:version/:target/(:uid)?', function(req, res) {
	log.out("API.Call()");
	var tstime  = new Date().getTime();
		query   = req.query,
		params  = req.params,
		method  = (typeof query.method === "undefined")?req.method:query.method;

	res.type('application/vnd.api+json');
	try {

		api.getVersion(params.version).call(method, params.target, params.uid, query, function(err, response) {
			try {
				if (!response) throw new Error("Empty response from API.Call");

				if (err) {
					throw new APIException(err);
				} else {
					if (process.env.debug)
						res.send({
							"resource"  : resource_lib.get_resource(resources, resource_lib.parse_request("/")),
//							"resources" : resources,
							"query"     : query,
							"response"  : response
						});
					else res.send(response);
				}
				log.out("API:Call in the end in "+(new Date().getTime() - tstime)+"ms");
			} catch(e) {
				res.status(e.httpstatus || 500).send((function(e){
					if (e instanceof APIException) {
						log.error("APIException while API.Call:", e.toString());
					} else {
						log.error("Unindetified error while API.Call", e);
						e = { "ERROR": "Exception", "Exception": e, "stack": e.stack };
					}
					log.error(e.stack);
					return e;
				})(e));
			}	
		});

	} catch(e) {
		res.status(e.httpstatus || 500).send((function(e){
			if (e instanceof APIException) {
				log.error("APIException while API.Call:", e.toString());
			} else {
				log.error("Unindetified error while API.Call", e);
				e = { "ERROR": "Exception", "Exception": e, "stack": e.stack };
			}
			log.error(e.stack);
			return e;
		})(e));
	}	
});

try {
	app.listen(process.env.http_port, process.env.http_host);
	log.system("HTTP Server running at "+process.env.http_host+":"+process.env.http_port);
} catch(e) {
	log.error("while starting to listen HTTP "+process.env.http_host+":"+process.env.http_port)
	log.error(e);
}

if (HTTPS) {
	try {
		HTTPS.server.listen(HTTPS.port, HTTPS.host);
		log.system("SSL server running at "+HTTPS.host+":"+HTTPS.port);
	} catch(e) {
		log.error("while starting to listen HTTPS "+HTTPS.host+":"+HTTPS.port)
		log.error(e);
	}
}

