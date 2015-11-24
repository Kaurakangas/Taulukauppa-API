var log = require("./log.js");

function parse_resurce_column_func(column) {
	var c = { aliases : [], permissions : 1 };
	if (typeof column === "object") {
		switch(column.length) {
			case 2: c.aliases     = column[1] || c.aliases;
			case 1: c.permissions = column[0] || c.permissions;
		}
	} else if (typeof column === "number") {
		c.permissions = column;
	} else c = {};
	return c;
}

function parse_resurce_columns_func(columns) {
	if (typeof columns  !== "object") return {};
	var c, cs = {};
	for(var key in columns) {
		c = parse_resurce_column_func(columns[key]);
		if (!c) continue;
		cs[key] = c;
		for(alias in c.aliases) cs[alias] = c;
	}
	return cs;
}

function parse_sort_func(sort_str) {
	if (!sort_str || sort_str.length == 0) return [];
	var s, o,
	    sort = [],
	    sorts = sort_str.split(",");

	for(s in sorts) {
		s = sorts[s];
		o = "ASC";
		switch(s[0]) {
			case "-":  o = "DESC";
			case "+":  s = s.substring(1);
		}
		sort.push([s,o]);
	}

	return sort;
}

function parse_sub_resources_func(resources) {
	return parse_resources_func(resources);
}

function parse_resource_func(target) {
	var r = {
			"type"              : "table",
			"target_key_column" : "uid",
			"sort"              : []
		};

	if (typeof target                  !== "object" ||
	    typeof target.table            === "undefined" ||
	    typeof target.local_key_column === "undefined") return {};

	r.type              = target.type              || r.type;
	r.table             = target.table;
	r.local_key_column  = target.local_key_column;
	r.target_key_column = target.target_key_column || r.target_key_column;
	r.uid               = parse_resurce_columns_func(target.uid);
	r.list              = parse_resurce_columns_func(target.list);
	r.sub               = parse_sub_resources_func(target.sub);
	r.sort              = parse_sort_func(target.sort);

	if (r.uid.length === 0 && r.list.length === 0) return {};

	switch(r.type) {
		case "table": return r;
		case "mapping":
			if (typeof target.mapping_table !== "undefined" &&
				typeof target.map_local_key_column !== "undefined" &&
				typeof target.map_target_key_column !== "undefined") {
					r.mapping_table         = target.mapping_table;
					r.map_local_key_column  = target.map_local_key_column;
					r.map_target_key_column = target.map_target_key_column;

					return r;
			}
		default: return {};
	}
}

function parse_resources_func(resources){
	var r, rs = {};

	if (typeof resources !== "object") return {};

	for (var key in resources) {
		r = parse_resource_func(resources[key]);
		rs[key] = r;
	}
	return rs;
};

function build_resource_tree_func(resources, base) {
	var r, tr = [];
	base = base || "";
	for(var key in resources) {
		r = resources[key];
		if (Object.getOwnPropertyNames(r.list).length !== 0)
			tr.push(base+"/"+key);

		if (Object.getOwnPropertyNames(r.uid).length !== 0)
			tr.push(base+"/"+key+"/:uid");

		tr = tr.concat(build_resource_tree_func(r.sub, base+"/"+key+"/:uid"));
	}
	return tr;
}

function parse_resource_request_func(resource_request) {
	var r, res_req, none_val = undefined,
		regex = /^(?:\/([\d\w]{2,}))(?:\/([a-fA-F\d]{16})(?:\/([\d\w]{2,})(?:\/([a-fA-F\d]{16})(?:\/(.+))?)?)?)?/;

    r = resource_request.match(regex);

	res_req = {
		"res"        : r[1] || none_val,
		"res_uid"    : r[2] || none_val,
		"sub_res"    : r[3] || none_val,
		"sub_res_uid": r[4] || none_val,
		"end"        : r[5] || none_val,
		"input"      : r.input,//(r.input.substring(r.input.length-1)=="/")?s.substring(0,s.length-1):r.input,
		"toString"   : function() { return resource_request; }
	};

    log.debug("RECOURCES: Parsed resource request: ", res_req);

	return res_req;
};


//if(!!req.sub_res_uid && !!res.sub[req.sub_res].uid)
//if(!!req.sub_res     && !!res.sub[req.sub_res].list)



function get_sql_query_params_func(resources, resource_request, token_lvl) {
	var req = resource_request;
	var res = resources[req.res];
	console.log(res);
	return;
	var cols, rs = {
		table : [],
		where : [],
		sort : res.sort,
		cols  : {},
		limit : undefined
	};
	var c_func = function(a,b){ return a&b===a || a&b===b; };

	if (!!req.sub_res) {
		var sub_res = res.sub[req.sub_res];
		rs.table.push(sub_res.table);

		cols = (!!req.sub_res_uid)?sub_res.uid:sub_res.list;

		if (Object.getOwnPropertyNames(cols).length === 0)
			throw new Error("Resource "+req+" not available");

 		switch(sub_res.type) {
			case "table":
				if (!!req.sub_res_uid) {
					rs.where.push([
						sub_res.table+"."+sub_res.target_key_column,
						"'"+req.sub_res_uid+"'"
					]);
					rs.limit = 1;
				} else {
				}

				break;
			case "mapping":
//				var map_target_res = ;
				rs.table.push(sub_res.mapping_table);

				rs.where.push([
					res.table+"."+sub_res.local_key_column,
					sub_res.mapping_table+"."+sub_res.map_local_key_column
				]);
				rs.where.push([
					sub_res.mapping_table+"."+sub_res.map_target_key_column,
					sub_res.table+"."+sub_res.target_key_column
				]);

				if (!!req.sub_res_uid) {
					rs.where.push([
						sub_res.table+"."+sub_res.target_key_column,
						"'"+req.sub_res_uid+"'"
					]);
					rs.limit = 1;
				}
				break;
		}
	} else {
		cols = (req.res_uid)?res.uid:res.list;

		if (Object.getOwnPropertyNames(cols).length === 0)
			throw new Error("Resource "+req+" not available");

		rs.table.push(res.table);

		if (!!req.res_uid) {
			rs.where.push([
				res.table+"."+res.target_key_column,
				"'"+req.res_uid+"'"
			]);
			rs.limit = 1;
		}

	}

	if (typeof token_lvl == "number") {
		for (col in cols) {
			/* TODO: oikeuksien tarkistaminen */
			if (c_func(cols[col].permissions, token_lvl))
				rs.cols[col] = cols[col];
		}
	} else rs.cols = cols;

	/* DEBUG-vaiheen jälkeen ei tarvi rs'n kanssa pelleillä */
	return rs["_query"] = (function(r){
		var q = {
			"cols"   : (function(r){
				var cols_arr = [];
				for (i in r.cols) {
					if (!!r.cols[i])
						 cols_arr.push(i+((!!r.cols[i].as)?(" AS "+r.cols[i].as):''));
				}
				return cols_arr;
			})(r),

			"tables" : r.table,

			"where"  : (function(r){
				var ws = [];
				for(i in r.where) ws.push(r.where[i][0]+"="+r.where[i][1]);
				return ws;
			})(r),

			"limit" : r.limit,

			"sort" : (function(r){
				var rs = [];
				for(s in r) {
					if (typeof r[s] == "string") r[s] = [r[s], "ASC"];
					rs.push(r[s][0]+" "+(!!r[s][1]?r[s][1]:"ASC"));
				}
				return rs;
			})(r.sort)
		};

		q["_str"] = "SELECT "+q.cols.join(" , ")
			       +" FROM "+q.tables.join(" , ")
			       +((q.where.length>0)?(" WHERE "+q.where.join(" AND ")):"")
			       +((q.sort.length>0)?(" ORDER BY "+q.sort.join(" , ")):"")
			       +((!!q.limit)?(" LIMIT "+q.limit):"")+";";


		return q;
	})(rs);

	return rs;
}


module.exports.parse      = parse_resources_func;
module.exports.build_tree = build_resource_tree_func;
module.exports.parse_request = parse_resource_request_func;
module.exports.parse_sort = parse_sort_func;
module.exports.get_sql_query_params = get_sql_query_params_func;
