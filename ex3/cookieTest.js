/*
 tester which tests our web-server's core functionality, including
 reviving and shutting it down
 */

var HOST = 'localhost';
var PORT = 8888;

var passed_counter = 0;
var failed_counter = 0;
var test_counter = 0;
var index =0;
var timeout=200;
var DEBUG = true;
var http = require('http');
var net = require('net');
http.globalAgent.maxSockets = 250;
var hujiwebserver = require('./hujiwebserver');

// register of all routes relevant for testing.

hujiwebserver.use('/test/cookie', function (req, res, next) {
    res.status(200);
    res.send(JSON.stringify(req.cookies));
});


hujiwebserver.use('/params/:id/gabi/:num', function (req, res, next) {
    res.status(200);
    res.send(req.path + '->' + JSON.stringify(req.params));
});


hujiwebserver.use(function (req, res, next) {
    if (req.path == '/catchme/foo/boo/style.css') {
        res.status(200);
        res.send("catch /*");
        return;
    }
    next();
});


hujiwebserver.use('/request/test/params/:param', function (req, res, next) {
    res.status(200);
    res.send(JSON.stringify(req.params));
});


hujiwebserver.use('/request/test/query', function (req, res, next) {
    res.status(200);
    res.send(JSON.stringify(req.query));
});


hujiwebserver.use('/request/test/cookie', function (req, res, next) {
    res.status(200);
    res.send(JSON.stringify(req.cookies));
});


hujiwebserver.use('/request/test/path', function (req, res, next) {
    res.status(200);
    res.send(req.path);
});

hujiwebserver.use('/request/test/host', function (req, res, next) {
    res.status(200);
    res.send(req.host);
});


hujiwebserver.use('/request/test/protocol', function (req, res, next) {
    res.status(200);
    res.send(req.protocol);
});

hujiwebserver.use('/request/test/get/Content-Type', function (req, res, next) {
    res.status(200);
    res.send(req.get("Content-Type"));
});

hujiwebserver.use('/request/test/get/content-type', function (req, res, next) {
    res.status(200);
    res.send(req.get("content-type"));
});

hujiwebserver.use('/request/test/get/Something', function (req, res, next) {
    res.status(200);
    res.send(req.get("Something"));
});

hujiwebserver.use('/request/test/params_input/user/:name', function (req, res, next) {
    res.status(200);
    res.send(req.param('name'));
});

hujiwebserver.use('/request/test/param', function (req, res, next) {
    res.status(200);
    res.send(req.query['name']);
});




hujiwebserver.use('/request/test/is', function (req, res, next) {
    var t = req.is(req.body);
    t = ( t ) ? "true" : "false";
    res.status(200);
    res.send(t);
});


hujiwebserver.use('/response/test/set', function (req, res, next) {
    res.set('Content-Type', 'response_test_set');
    res.status(200).send();
});
hujiwebserver.use('/response/test/status', function (req, res, next) {
    res.status(404).send("gabi was here");
});

hujiwebserver.use('/response/test/get', function (req, res, next) {
    res.set('Content-Type', 'response_test_set');
    res.status(200);
    res.send(res.get('Content-Type'))
});
hujiwebserver.use('/response/test/send/:id', function (req, res, next) {
    res.status(200);

    switch (req.params.id) {
        case '1':
            res.send(new Buffer('whoop'))
            break;
        case '2':
            res.json({some: 'json'});
            break;
        case '3':
            res.send('some html');
            break;
        case '4':
            res.status(404).send('Sorry, we cannot find that!');
            break;
        case '5':
            res.status(500).json({error: 'something blew up'});
            break;
        case '6':
            res.send();
            break;
        default :
            res.status(404).send();
    }
});

hujiwebserver.use('/response/test/json/:id', function (req, res, next) {
    res.status(200);
    switch (req.params.id) {
        case '1':
            res.json(null);
            break;
        case '2':
            res.json({user: 'tobi'});
            break;
        case '3':
            res.status(500);
            res.json({error: 'message'});
            break;
        default :
            res.status(404).send();
    }
});


hujiwebserver.use('/response/test/next', function (req, res, next) {
    res.body = 'next1;'
    next();
});

hujiwebserver.use('/response/test/next', function (req, res, next) {
    res.body += 'next2;'
    next();
});

hujiwebserver.use('/response/test/next', function (req, res, next) {
    res.body += 'next3;'
    res.status(200).send(res.body);
});

hujiwebserver.use('/test/cookie', function(req, res, next){
    res.send(200, req.cookies );
});
hujiwebserver.use('/test/json', function(req, res, next){
    res.status(200).send(JSON.stringify(req.body) );
});

// hujiwebserver.use("/static", hujiwebserver.static("www"));
hujiwebserver.use('/test/bodyParser', function(req, res, next){
    res.status(200).send(JSON.stringify(req.body) );
});

var server = hujiwebserver.start(PORT, function(err) {

    // check if thtartere were errors in revivng the server
    if (err) {
        console.log("test failed : could not revive server " + err);
        return;
    }

    console.log("server successfully listening to port " + PORT);
    console.log("starting test suite");




    setTimeout(function() {server.stop();console.log("server shutdown")},15000);
    run_server_tests(); // start running test
});



/*
 * send a msg to the server with options and making sure the response is as expected
 *
 * options = {
 *              path:<path>,
 *              method:<method>,
 *              data:<data>,
 *              test_name:<test name>
 *            }
 * expected = {
 *              status:<status>,
 *              data:<data>
 *             }
 */
function single_server_test(options, expected){
    var req_options = {
        hostname: HOST,
        port: PORT,
        path: options.path,
        method: options.method
    };


    // check if http request test should be sent with some headers
    if(options.headers){
        req_options.headers = options.headers;
    }

    // send the http request test to the server
    var req = http.request(req_options, function(res) {
        var buffer = '';
        res.setEncoding('utf8');
        // accumulating the http response body
        res.on('data', function (chunk) {
            buffer += chunk;
        });

        // upon receiving the whole http repponse
        res.on('end', function () {
            test_counter++;
            res.buffer = buffer;


            // check if we pass the relevant test - namely what expected is what we got
            if(res.statusCode != expected.status || (expected.data && (expected.data != buffer)) ||
                (expected.func && !expected.func(res))){

                console.warn("test #"+test_counter+":  "+options.test_name + " ... FAILED");
                failed_counter++;

                // in case, we're in DEBUG mode show more details why the test failed.
                if(DEBUG){
                    console.warn("--------------------------------------------------");

                    // check if http response status is not what we expected.
                    if(res.statusCode != expected.status){
                        console.warn("got ", res.statusCode," but expected", expected.status);
                    }

                    // check if http response body is not what we expected.
                    if(buffer != expected.data){
                        console.warn("got ",buffer," but expected",expected.data);
                    }

                    if(expected.func && !expected.func(res)){
                        console.warn("func failed");
                        console.warn(expected.func.toString());
                    }
                    console.warn("--------------------------------------------------");
                }

                // current test succeeded
            } else {
                console.log("test #"+test_counter + ":  "+options.test_name + " ... PASSED");
                passed_counter++;
            }

            // check if it's the last test to run, and if so show total tester results.
            if(test_counter >= test_l.length){
                report_test_results();
            }
        });

    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    if(options.data){
        req.write(options.data);
    }
    req.end();

    // running the next test in our tester
    if(index<test_l.length-1) {
        setTimeout(function () {
            index += 1;
            single_server_test(test_l[index].options, test_l[index].expected)
        }, 100);
    }
}

/**
 * dumps to STDOUT the testing results.
 */
function report_test_results(){
    console.log("--------------------------------------------------");
    console.log("total of ", passed_counter,"/",passed_counter+failed_counter, " tests were passed");
    console.log("--------------------------------------------------");
}


/**
 * running the tester with all the tests in test_l on the server.
 */
function run_server_tests() {
    setTimeout(function() {single_server_test(test_l[0].options, test_l[0].expected)}, 1000);
}

// array of all the tests that we're running on the server
var test_l = [
    {
        options: {
            path:"/test/cookie",
            method:"GET",
            test_name:"testing the cookie parsing",
            headers:{"Cookie": "name=value"}
        },
        expected:{
            status:200,
            data:"{\"name\":\"value\"}"
        }
    },
    {
        options: {
            path:"/params/201582723/gabi/25/gabi.txt",
            method:"GET",
            test_name:"testing path with parameters e.g /params/:id/gabi/:num/"
        },
        expected:{
            status:200,
            data:"/params/201582723/gabi/25/gabi.txt->{\"id\":\"201582723\",\"num\":\"25\"}"
        }
    },
    {
        options: {
            path:"/catchme/foo/boo/style.css",
            method:"GET",
            test_name:"testing the use(func(){..}) will catch /* paths, ( resource is optional )"
        },
        expected:{
            status:200,
            data:"catch /*"
        }
    }, // request
    {
        options: {
            path:"/request/test/params/param123",
            method:"GET",
            test_name:"testing the request params object"
        },
        expected:{
            status:200,
            data:"{\"param\":\"param123\"}"
        }
    },
    {
        options: {
            path:"/request/test/query?q=omer+ornan",
            method:"GET",
            test_name:"testing the request query object for ?q=omer+ornan"
        },
        expected:{
            status:200,
            data:"{\"q\":\"omer ornan\"}"
        }
    },
    {
        options: {
            path:"/request/test/cookie",
            method:"GET",
            test_name:"testing the request Cookie object for Cookie: name=tj",
            headers:{Cookie: "name=tj"}
        },
        expected:{
            status:200,
            data:"{\"name\":\"tj\"}"
        }
    },
    {
        options: {
            path:"/request/test/cookie",
            method:"GET",
            test_name:"testing the request Cookie object for Cookie: name=tj",
            headers:{Cookie: "name=tj"}
        },
        expected:{
            status:200,
            data:"{\"name\":\"tj\"}"
        }
    },
    {
        options: {
            path:"/request/test/path/gabi?order=desc&shoe[color]=blue&shoe[type]=converse",
            method:"GET",
            test_name:"testing the request path"
        },
        expected:{
            status:200,
            data:"/request/test/path/gabi"
        }
    },
    {
        options: {
            path:"/request/test/host/omer.txt",
            method:"GET",
            test_name:"testing the request host"
        },
        expected:{
            status:200,
            data:"localhost"
        }
    },
    {
        options: {
            path:"/request/test/protocol/omer.txt",
            method:"GET",
            test_name:"testing the request protocol"
        },
        expected:{
            status:200,
            data:"http"
        }
    },

    {
        options: {
            path:"/request/test/param?name=gabi",
            method:"GET",
            test_name:"testing request param('name') for path ?name=gabi"

        },
        expected:{
            status:200,
            data:"gabi"
        }
    },
    {
        options: {
            path:"/request/test/params_input/user/gabi",
            method:"GET",
            test_name:"testing request param('name') for user/:name"
        },
        expected:{
            status:200,
            data:"gabi"
        }
    },

    {
        options: {
            path:"/response/test/set",
            method:"GET",
            test_name:"testing response.set('Content-Type','response_test_set')"
        },
        expected:{
            status:200,
            data:"",
            func: function(res){
                return (JSON.stringify(res.headers["content-type"]) == "\"response_test_set\"");
            }
        }
    },

    {
        options: {
            path:"/response/test/status",
            method:"GET",
            test_name:"testing res.status(404)"
        },
        expected:{
            status:404,
            data:"gabi was here"
        }
    },
    {
        options: {
            path:"/response/test/get",
            method:"GET",
            test_name:"testing res.get('Content-Type')"
        },
        expected:{
            status:200,
            data:"response_test_set"
        }
    },
    {
        options: {
            path:"/response/test/send/2",
            method:"GET",
            test_name:"testing res.send({ some: 'json' })"
        },
        expected:{
            status:200,
            data:"{\"some\":\"json\"}"
        }
    },
    {
        options: {
            path:"/response/test/send/3",
            method:"GET",
            test_name:"testing res.send('some html')"
        },
        expected:{
            status:200,
            data:"some html"
        }
    },

    {
        options: {
            path:"/response/test/send/5",
            method:"GET",
            test_name:"testing res.send(500, { error: 'something blew up' })"
        },
        expected:{
            status:500,
            data:"{\"error\":\"something blew up\"}"
        }
    },
    {
        options: {
            path:"/response/test/json/3",
            method:"GET",
            test_name:"testing 500, { error: 'message' })"
        },
        expected:{
            status:500,
            data:"{\"error\":\"message\"}"
        }
    },
    {
        options: {
            path:"/response/test/next",
            method:"GET",
            test_name:"testing that the next() method works"
        },
        expected:{
            status:200,
            data:"next1;next2;next3;"
        }
    },
    {
        options: {
            path:"/no/such/path",
            method:"GET",
            test_name:"testing 404 not found error"
        },
        expected:{
            status:404
        }
    },

    {
        options: {
            path:"/test/cookie",
            method:"GET",
            test_name:"testing the cookieParser middleware",
            headers:{"Cookie": "name=value" }
        },
        expected:{
            status:200,
            data:"{\"name\":\"value\"}"
        }
    },
    // {
    //     options: {
    //         path:"/test/json",
    //         method:"POST",
    //         test_name:"testing the json middleware",
    //         headers:{"Content-Type": "application/json", 'Content-Length':JSON.stringify({"omer":5, "gabi":"7"}).length },
    //         data:JSON.stringify({"omer":5, "gabi":"7"})
    //     },
    //     expected:{
    //         status:200,
    //         data:"{\"omer\":5,\"gabi\":\"7\"}"
    //     }
    // },
    // {
    //     options: {
    //         path:"/test/bodyParser",
    //         method:"POST",
    //         test_name:"testing the bodyParser middleware",
    //         headers:{"Content-Type": "application/x-www-form-urlencoded",
    //             'Content-Length':"param1=value1&param2=value2".length },
    //         data:"param1=value1&param2=value2"
    //     },
    //     expected:{
    //         status:200,
    //         data:"{\"param1\":\"value1\",\"param2\":\"value2\"}"
    //     }
    // },
    {
        options: {
            path:"/request/test/get/Content-Type",
            method:"POST",
            test_name:"testing request get('Content-Type')",
            headers:{"Content-Type": "text/html", "Content-Length":"hello world!".length},
            data:"hello world!"

        },
        expected:{
            status:200,
            data:"text/html"
        }
    },
    {
        options: {
            path:"/request/test/get/Something",
            method:"POST",
            test_name:"testing request get('Something')",
            headers:{"Content-Type": "text/html", "Content-Length":"hello world!".length},
            data:"hello world!"

        },
        expected:{
            status:200,
            data:""
        }
    }
    // {
    //     options: {
    //         path:"/request/test/is",
    //         method:"POST",
    //         test_name:"testing req.is('html') for \"Content-Type: text/html; charset=utf-8\"",
    //         headers:{"Content-Type": "text/html; charset=utf-8", "Content-Length":"html".length },
    //         data:"html"
    //     },
    //     expected:{
    //         status:200,
    //         data:"true"
    //     }
    // },
    // {
    //     options: {
    //         path:"/request/test/is",
    //         method:"POST",
    //         test_name:"testing req.is('text/html') for \"Content-Type: text/html; charset=utf-8\"",
    //         headers:{"Content-Type": "text/html; charset=utf-8", "Content-Length":'text/html'.length },
    //         data:'text/html'
    //     },
    //     expected:{
    //         status:200,
    //         data:"true"
    //     }
    // },
    // {
    //     options: {
    //         path:"/request/test/is",
    //         method:"POST",
    //         test_name:"testing req.is('json') for \"Content-Type: application/json\"",
    //         headers:{"Content-Type": "application/json", "Content-Length":'json'.length },
    //         data:'json'
    //     },
    //     expected:{
    //         status:200,
    //         data:"true"
    //     }
    // },
    // {
    //     options: {
    //         path:"/request/test/is",
    //         method:"POST",
    //         test_name:"testing req.is('application/json') for \"Content-Type: application/json\"",
    //         headers:{"Content-Type": "application/json", "Content-Length":'application/json'.length },
    //         data:'application/json'
    //     },
    //     expected:{
    //         status:200,
    //         data:"true"
    //     }
    // }

];
