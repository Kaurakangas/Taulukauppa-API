var log      = require("./log.js");
var postgres = require('pg');

module.exports = {

	client : undefined,

	doSelect : function(str, values, callback) {
		log.out("db.doSelect - ", str, values);
		var query = null;
		try {
			query = this.client.query({
				'text'  : str,
				'values': values
			}, callback);
		} catch(e) {
			log.e_error(e);
		}
		return query;
	},

	build : function(c) {
		c.conString = "postgres://"+c.username+":"+c.password+"@"+c.server+":"+c.port+"/"+c.masterDB;
		this.client = new postgres.Client(c.conString);
	},
	run : function() {
		this.client.connect();
		log.system("Database running");
	}
};