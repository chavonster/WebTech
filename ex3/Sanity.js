var hujiwebserver = require('./hujiwebserver');
var http = require('http');
http.globalAgent.maxSockets = 100;

var HOST = 'localhost';
var PORT = 8082;

var serverObj = hujiwebserver.start(PORT, function(errStart) {
	if (errStart) {
		console.log("ERROR: Sanity - Couldn't start serverObj. .start(port,callback(err)) method returns serverObj which starts the server");
	} else {
		console.log("INFO: Server is successfully listening to port " + PORT);
	}
});
		
			
// TEST 1
hujiwebserver.use('/cookie', function (req, res, next) {
	res.status(200);
	res.send(req.cookies);
});

HTTPSender({
	id: 1,
	path: "/cookie",
	method: "GET",
	headers: {"Cookie": "name=value; name2=value2"}
},{
	status: 200,
	data: "{\"name\":\"value\",\"name2\":\"value2\"}"
});

// TEST 2
hujiwebserver.use('/request/host', function (req, res, next) {
	res.status(200);
	res.send(req.host);
});

HTTPSender({
	id: 2,
	path:"/request/host/test.txt",
	method:"GET",
	headers: {}
},{
	status:200,
	data:"localhost"
});


// TEST 3
hujiwebserver.use('/response/send', function (req, res, next) {
	res.status(404).send('HTTP 404 File Not Found');
});

HTTPSender({
	id: 3,
	path:"/response/send",
	method:"GET",
	headers: {}
},{
	status:404,
	data:"HTTP 404 File Not Found"
});


try {
	setTimeout(function () {
		serverObj.stop();
		}, 3000);
} catch (errStop) {
	console.log("ERROR: Sanity - Couldn't stop serverObj. serverObj should have a .stop() function that stops listening");
}

function HTTPSender(options, expected) {
	var req_options = {
		hostname: HOST,
		port: PORT,
		path: options.path,
		method: options.method,
		headers: options.headers
	};
			
	var req = http.request(req_options, function(res) {
		var buffer = '';

		res.on('data', function (chunk) {
			buffer += chunk;
		});

		res.on('end', function () {
			res.buffer = buffer;
			
			if(res.statusCode != expected.status || expected.data != buffer) {
				console.warn("INFO: #id=" + options.id + " failed {expected: " + expected.data + "}");
			} else {
				console.log("INFO: #id=" + options.id + " passed");
			}
		});
	});
	
	req.on('error', function(e) {
		console.warn('ERROR: ' + e.message);
	});

	req.end();
}