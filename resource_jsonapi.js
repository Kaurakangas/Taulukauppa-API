var resources;

function jsonapi_gen_resource_obj_base_func(req_p) {}

function jsonapi_gen_resource_obj_func(req_p, r) {
	var res = {
		"type" : null,
		"id" : undefined,
		"attributes" : r,
		"relationships" : {},
		"meta" : {
			//,"res_req" : req_p,"r" : r
		}
	}, subs = [];
	if (!!req_p.sub_res) {
		res.type = req_p.sub_res;
		if (!!req_p.sub_res_uid) {
			res.id = req_p.sub_res_uid;
		} else { }
	} else {
		res.type = req_p.res;
		if (!!req_p.res_uid) {
			res.id = req_p.res_uid;

			subs = resources[req_p.res].sub;

			for(t in subs) {
				var rr = {
					"links" : {
						"self" : "/"+req_p.res+"/"+req_p.res_uid+"/"+t
					}
				};

				switch(subs[t].type) {
					case "table":
						var suid = r[subs[t].local_key_column];
						rr.links["self"] = "/"+req_p.res+"/"+req_p.res_uid+"/"+t+"/"+suid;
						break;
					case "mapping":
//						rr.links["self"] = "/"+req_p.res+"/"+req_p.res_uid+"/"+t+"/"+r[subs[t].map_local_key_column];
//						rr.links["related"] = "/"+r[subs[t].table]+"/";
						break;
				}

				res.relationships[t] = rr;
			}
		} else { }
	}

	if(!!res.id) {
		res.links = {
			"self" : "/"+res.type+"/"+res.id
		};
	} else {
		res.links = {
			"self" : "/"+res.type+"/"+r.uid
		};
	}


	return res;
}

function jsonapi_gen_func(e, req_p, rows) {
	var res = {};

	if (e) {
		res.error = e;
	} else {
		res.data = [];
		for(i in rows) {
			res.data.push(jsonapi_gen_resource_obj_func(req_p,rows[i]));
		}
	}

	res.links = {
		"self" : req_p.input
	};

	res.meta = {
		"copyright" : "Copyright 2015 Artest.net",
		"authors" : [
			"Miro Nieminen <miro@artest.net>"
		]
	};

	return res;
}
module.exports.jsonapi_gen_func = jsonapi_gen_func;
module.exports.jsonapi_set_resources_func = function(ress) {
	resources = ress;
};	