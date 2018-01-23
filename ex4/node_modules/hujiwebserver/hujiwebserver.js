// requires
let net = require('net'),
    Route = require('route-parser'),
    httpParser = require('./httpparser.js');

// Constants
const TIMEOUT = 25000,                      // timeout for requests
      CONTENT_TYPE = 'Content-Type',        // content-type header name
      CONTENT_LENGTH = 'Content-Length',    // content-length header name
      DEFAULT_CTYPE = 'text/plain',         // deafult response content type
      COOKIE = 'Set-Cookie',                // set-cookie header name
      REST = 'rest';                        // the ending *splat

// Regex
let splat = /\/\*\w+$/;


// Helper functions

/**
 * Prints an informative error message to the log
 * should be commented when submitted(?)
 */
function printErrorMsg(err, funcName) {
    console.warn(`Error (${err.name}) in ${funcName}: ${err.message}`);
}

/**
 * Creates a Command object
 * @param {String} path - the path for the command: if it doesn't end with a
 *                        *splat, an optional (/*rest) is added to match every
 *                        path that prefixes this command
 * @param {Function} middleware - the callback to run if the
 *                                path is matched
 * @return {Command} - a command object with the route parser
 *                     and the middleware to run for a matchin route
 */
function Command(path, middleware) {
    let suffix;
    this.middleware = middleware;
    if (!splat.test(path)) {
        suffix = '*' + REST;
        // if path doesn't end with a /, append a /*rest splat
        if (!path.endsWith('/')) {
            suffix = '/' + suffix;
        }
        path += `(${suffix})`;
    }
    // add a route parser to match paths
    this.route = new Route(path);
}


/**
 * Response object constructor
 * @param {net.Socket} socket - a writable socket to which the
 *                              response is written.
 */
function Response(socket) {
    // private variables
    let my_socket = socket,     // the socket to write to
        headers = {},           // response's header
        status_code = 200,      // default status is 200 OK
        is_sent = false;        // whether send() was used
        is_closed = false;      // whether the socket is closed

    // save whether the socket is closed by the other end
    my_socket.on('close', () => {
        this.is_closed = true;
    });

    /**
     * @return {boolean} true if this response was sent, false otherwise
     */
    this.sent = () => is_sent;

    /**
     * @return {boolean} true if the socket is closed, false o/w.
     */
    this.closed = () => is_closed;

    /**
     * Gets a header's value from the response
     * @param  {String} name - the header name
     * @return {String}     the header's value if exists,
     *                      undefined otherwise.
     */
    this.get = (name) => {
        return headers[name];
    };

    /**
     * Writes a header to the response
     * @param {String} name - the header's name
     * @param {String} value - header's value
     */
    this.set = (name, value) => {
        headers[name] = value;
        return this;
    };

    /**
     * Write a cookie to the response
     * @param  {String} name - cookie name
     * @param  {String} value - cookie value
     * @return {Response} - `this`
     */
    this.cookie = (name, value) => {
        let cookie_str = name + '=' + value;
        return this.set(COOKIE, cookie_str);
    };

    /**
     * Sets the response status code.
     * if NaN is given, writes 500
     * @param  {number} code response status
     * @return {Response}    `this`
     */
    this.status = (code) => {
        if (isNaN(code)) {
            code = 500;
        }
        status_code = code;
        return this;
    };

    /**
     * Sends this HTTP response
     * @param  {String|Array|JSON} body - the response body
     * @return {Response} - `this`
     */
    this.send = (body) => {
        // infer content type if it is not yet set
        if (this.get(CONTENT_TYPE) === undefined) {
            let contentType = DEFAULT_CTYPE;
            // if JSON
            if (body instanceof Array || body instanceof Object) {
                this.json(body);
                return this;
            // if string
            } else if (body instanceof String) {
                contentType = httpParser.html;
            }
            this.set(CONTENT_TYPE, contentType);
        }
        // if body contains nothing, don't write any string
        if (body === null || body === undefined) {
            body = '';
        }
        // if content-length isn't written yet, write it according to
        // the body parameter
        if (body.length > 0 && this.get(CONTENT_LENGTH) === undefined) {
            this.set(CONTENT_LENGTH, body.length);
        }
        // send the data
        try {
            if (!is_closed && !my_socket.destroyed) {
                my_socket.end(
                    httpParser.writeResponse(headers, status_code, body));
                is_sent = true;
            }
            return this;
        } catch (err) {
            printErrorMsg(err, 'Response.send()');
        }
    };

    /**
     * Sends this response with JSON as body
     * @param  {Object|Array} json_obj - the json body
     * @return {Response} - `this`
     */
    this.json = (json_obj) => {
        // empty objects are handled
        if (json_obj === undefined || json_obj === null) {
            json_obj = '';
        }
        // set the content type as JSON and continue as usual
        this.set(CONTENT_TYPE, httpParser.json);
        this.send(JSON.stringify(json_obj));
    };
}


/**
 * tries to send a 404 in case a request was not handled
 * @param  {Response} response: the response object
 * @param  {string} msg:      a message to send
 * @param  {string} funcName: the function name that called this function
 */
function requestNotHandled(response, msg, funcName) {
    try {
        if (!response.sent()) {
            response.status(404).send(msg);
        }
    } catch (err) {
        printErrorMsg(err, funcName);
    }
}


/**
 * Checks every command in the commands array and
 * runs the first that matches. Continues running
 * only if `next` method is used.
 * Sends a 404 response if middleware failed to send
 * a response within 25 seconds.
 * @param  {request} request - the request object
 * @param  {Response} response - the response object
 */
function runMiddleware(request, response, socket) {
    let finished = true, handled = false,
        commands = module.exports.commands,
        next = () => { finished = false; },
        command = null,
        params = null;
    if (!(commands instanceof Array)) { // TODO - check
        return;
    }

    // return 404 after TIMEOUT ms of socket inactivity
    socket.setTimeout(TIMEOUT, () => {
        requestNotHandled(response, 'Request timed out', 'runMiddleware()');
    });

    // Find each matching command and run its middleware
    for (let i = 0; i < commands.length; ++i) {
        command = commands[i];
        params = command.route.match(request.path);
        // route.match returns false if the path doesn't match, and a params
        // object otherwise.
        if (params) {
            try {
                delete params[REST];
                // Add the params from the match to the reqeust object
                request.params = params;
                // run the command's middleware
                command.middleware(request, response, next);
                // flag that some middleware handled the request
                handled = true;
            } catch (e) {
                printErrorMsg(e, command.middleware.name + ' (middleware)');
                // if middleware throws an error, send a 500 response.
                response.status(500).set(CONTENT_TYPE, DEFAULT_CTYPE)
                    .send(`Error in ${command.middleware.name} (middleware).`);
                return;
            }
            if (finished) {
                // This line is reached if `next()` wasn't invoked
                if (response.sent()) {
                    return;
                } else {
                    break;
                }
            }
            finished = true;
        }
        // Continue to the next middleware
    }
    // if all finished with no response, end the connection
    if (!handled) {
        requestNotHandled(response, 'Request could not be handled',
                          'runMiddleware() (end)');
    }
}

/**
 * Handles the data event from the socket
 * @param  {String} request_str - the data from the socket
 * @param  {net.Socket} socket - the socket from which the data came
 */
function requestHandler(request_str, socket) {
    let request,  // request object
        response; // response object

    // Create request and response objects
    request = httpParser.parse(request_str);
    response = new Response(socket);
    // Make sure the request is OK, otherwise
    // respond with a bad request status and quit
    if (request === null) {
        response.status(400).send();
        return;
    }
    // find the middleware to run and run it
    runMiddleware(request, response, socket);
}

/**
 * Handles the 'connection' event from the tcp server
 * @param  {net.Socket} socket - the connected socket
 */
function handleConnection(socket) {
    // log errors
    socket.on('error', (err) => {
        printErrorMsg(err, 'socket');
    });

    // when a request arrives, parse it
    socket.on('data', (data) => {
        requestHandler(data.toString(), socket);
    });
}

/**
 * The public module's members
 * @type {Object}
 */
module.exports = {
    commands: [],


    /**
     * adds a command to the commands array.
     * will run ``middleware`` when a request's path
     * matches the given ``path``.
     */
    use: function(path, middleware) {
        // Path is optional, '/' matches everything.
        if (middleware === undefined) {
            middleware = path;
            path = '/';
        }
        // Create a command object and save it
        let command = new Command(path, middleware);
        this.commands.push(command);
        return this;
    },


    /** Starts listening on the given ``port``.
     * Calls ``callback`` when a connection is established.
     */
    start: function(port, callback) {
        let server = net.createServer(handleConnection);
        server.listen(port, callback);
        // Returns an object that allows stopping the
        // server and getting its port
        return {
            stop: () => { server.close(); },
            port: port
        };
    }
};
