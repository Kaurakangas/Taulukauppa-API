function APIException(message) {
	this.message = message;
	this.name = "APIException";
	this.toJSON = function() {
//		return JSON.stringify(this);
		return {
			'type'    : this.name,
			'message' : this.message
		};
	}
	console.error("APIException created", this);
}

function CallGet(query) {
	console.log("API:CallGet()", query);
	return {};
//	throw new APIException("dumb");
};

exports.call = function(method, query) {
	console.log("API:call ("+method+")");
	if (typeof method !== "string") throw new APIException("Method must be String");
	switch(method.toLowerCase()) {
		case "get":
			return CallGet(query);
			break;
		case "post":
		default:
			throw new APIException("Method cannot recognize. ("+method+")");
	}
	throw new APIException("Internal API error. (method="+method+")");
}


exports.APIException = APIException;
exports.get = CallGet;