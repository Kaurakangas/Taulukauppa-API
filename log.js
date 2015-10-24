var get_ctime = function()  { return new Date().getTime(); },
	get_dtime = function(s) { return get_ctime() - (s || stime); },
	get_n_line = function() { return (new Error().stack).split("\n")[3].trim(); },
	stime = get_ctime();



var p_out = function(func, a, btxt) {
	var time_str_ws = 11,
		time_str = (get_dtime()/1000).toFixed(3);

	a = a || {};

	if (time_str.length < time_str_ws) 
		time_str = (new Array(time_str_ws-1-time_str.length).join("-")) + time_str;

	btxt = time_str + ((!!btxt)?(" :: "+btxt):"");
	switch(a.length) {
		case 1: return func(btxt, a[0]);
		case 2: return func(btxt, a[0], a[1]);
		case 3: return func(btxt, a[0], a[1], a[2]);
		case 4: return func(btxt, a[0], a[1], a[2], a[3]);
		case 5: return func(btxt, a[0], a[1], a[2], a[3], a[4]);
		case 6: return func(btxt, a[0], a[1], a[2], a[3], a[4], a[5]);
	}
	return func(btxt, a);
}


module.exports.debug  = function() { return p_out(console.log,   arguments, "DEBUG "+get_n_line()); }
module.exports.system = function() { return p_out(console.log,   arguments, "SYSTEM"); }
module.exports.out    = function() { return p_out(console.log,   arguments); }

module.exports.error  = function() { return p_out(console.error, arguments, "ERROR "+get_n_line()); }
module.exports.fatal  = function() { return p_out(console.error, arguments, "FATAL ERROR "+get_n_line()); }

module.exports.at     = function() { return p_out(console.log,   arguments, get_n_line()); }

module.exports.stacktrace   = function() { p_out(console.error, "STACKTRACE", new Error().stack); }

module.exports.e_stacktrace = function(e) { p_out(console.error, "ERROR STACKTRACE", e.stack); }
module.exports.e_error = function(e) { var self=this; self.error(e); self.e_stacktrace(e); }
module.exports.e_fatal = function(e) { var self=this; self.fatal(e); self.e_stacktrace(e); }

module.exports.INIT = function(){
	var str = "   STARTING SERVER AT "+new Date()+"   ",
		c = "#";

	console.log(Array(str.length+3).join(c));
	console.log(c+str+c);
	console.log(Array(str.length+3).join(c));
}


var __timers = {};
module.exports.timer = {
	start : function(i) {
		__timers[i || 0] = process.hrtime();
	},
	stop : function(i) {
		var d = process.hrtime(__timers[i || 0]);
		return d[0] + d[1] * 1e-9;
	}
};
