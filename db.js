var postgres = require('pg');

module.exports = {

	client : undefined,

	doSelect : function(str, values, callback) {
		console.log("db.doSelect - ", str, values);
		var query = this.client.query({
			'text'  : str,
			'values': values
		}, callback);
		return query;
	},

	build : function(c) {
		c.conString = "postgres://"+c.username+":"+c.password+"@"+c.server+":"+c.port+"/"+c.masterDB;
		this.client = new postgres.Client(c.conString);
	},
	run : function() {
		this.client.connect();
	}
};