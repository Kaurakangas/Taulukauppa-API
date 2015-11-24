var http     = require('http');
var https    = require('https');
var express  = require('express');
var fs       = require('fs');
var log      = require('./log.js'),
    api      = require('./api.js'),
    secure   = require('./secure.js'),
    db       = require('./db.js'),
    resource_lib  = require('./resources.js');



/* -------------- Ladattu kirjastot, aletaan valmistella käytettävää tietoa ------------ */
log.timer.start('load');



var APIException = api.APIException;

log.INIT();
log.system("START");

var app       = express();
var completeConfig, config = (completeConfig = function(cfg) {
	cfg.server = cfg.server || {};
	cfg.server.host = cfg.server.host || "localhost";
	cfg.server.port = cfg.server.port || 80;

	cfg.debug = cfg.debug || false;
	cfg.read_only = cfg.read_only || false;
	cfg.slow_motion = cfg.slow_motion || false;

	return cfg;
})(JSON.parse(fs.readFileSync("config.json", "utf8")));

var resources     = resource_lib.parse(require(config.resource_path)),
	resource_tree = resource_lib.build_tree(resources);

try {
	db.build(config.postgresql);
	db.run();
} catch(e) {
	log.fatal("Error while connecting to database", config.postgresql.conString, e);
	log.e_stacktrace(e);
	return;
}



log.system("Loaded! Took "+log.timer.stop('load')+"ns");
/* -------------- Resurssit ladattu, viimeistellään ja käsitellään ne ------------ */
log.timer.start('init');



api.jsonapi_set_resources(resources);
api.config(resources, config);

process.env.debug = config.debug;
process.http = {
	host : config.server.host,
	port : config.server.port	
};
process.https = (function(cfg){
	if (!!!cfg || (!!cfg.use && !cfg.use) ||
		!(typeof cfg.key  === "string" &&
		  typeof cfg.cert === "string" &&
		 (typeof cfg.port === "string" || typeof cfg.port === "number"))) return;

	var opt = {
		key  : fs.readFileSync(cfg.key),
		cert : fs.readFileSync(cfg.cert),
		host : (typeof cfg.host === "string") ? cfg.host : process.http.host,
		port : parseInt(cfg.port)
	};

	try {
		opt.server = https.createServer(opt, app);
	} catch(e) {
		log.error("Error while initializing HTTPS-server", e);
		log.e_stacktrace(e);
	}

	return opt;
})(config.server.https) || undefined;



log.system("Configured! Took "+log.timer.stop('init')+"ns");
/* -------------- Resurssit valmiina, voidaan alkaa toiminta ------------ */



app.all("*", function(req, res, next) {
	log.out("HTTP"+(req.secure?'S':'')+"::"+req.method.toUpperCase(), req.params, req.query);
	next();
});

app.get('/doc',     function(req, res) { res.sendFile(__dirname + "/public/documentation.html"); });
app.get('/console', function(req, res) { res.sendFile(__dirname + "/public/console.html"); });

app.all(/^\/(v\d)(?:\/(.*))/, function(req, res, next) {
	log.out("HTTP request", req.originalUrl, req.params);

	var request_version  = req.params[0],
		request_resource = '/'+(req.params[1] || ''),
		query   = req.query,
		method  = (typeof query.method === "undefined")?req.method:query.method;
	log.out("REGEXP CALL", request_version, request_resource);

	try {
		var res_req        = resource_lib.parse_request(request_resource),
		    res_req_params = resource_lib.get_sql_query_params(resources, res_req);

		api.getVersion(request_version).call(db, method, res_req_params, req.query, function(err, respond){
			log.debug("running response lambda", err, respond);


			if (!!err) {
				log.error(err);
				res.status(err.httpCode || 500).send(api.jsonapi_gen(err, res_req));
				return;
			}

			respond = api.jsonapi_gen(undefined, res_req, respond.rows);
			
			if (process.env.debug) {
				res.send({
					"response"       : respond,
					"query"          : query,
					"res_req"        : res_req,
					"res_req_params" : res_req_params
				});
			} else res.send(respond);
		});
	} catch (e){
		log.e_fatal(e);
		res.send(e);
	}
});

try {
	app.listen(process.http.port, process.http.host);
	log.system("HTTP Server running at "+process.http.host+":"+process.http.port);

	if (!!process.https) {
		try {
			process.https.server.listen(process.https.port, process.https.host);
			log.system(" SSL Server running at "+process.https.host+":"+process.https.port);
		} catch(e) {
			log.error("while starting to listen HTTPS "+process.https.host+":"+process.https.port)
			console.log("process.env.https", process.https.server);
			log.error(e);
		}
	}

} catch(e) {
	log.error("while starting to listen HTTP "+process.http.host+":"+process.http.port)
	log.error(e);
}