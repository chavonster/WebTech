// Imports
const app = require('./hujiwebserver'),
      fs = require('fs'),
      path = require('path');

// Constants
const FILES_DIR = 'filez',
      SUFFIX_MIME = {
          'html': 'text/html',
          'css': 'text/css',
          'js': 'application/javascript'
      },
      PORT = 8080;

// Global Variables
let server;

// Help functions

/**
 * sends a response with a given code and message
 * @param  {hujiwebserver.Response} res:    response object
 * @param  {int} code:      response status code
 * @param  {string} msg:    a message to send in the response
 * @param  {error} error:   an optional error argument to log to console
 */
function errorExit(res, code, msg, error = null) {
    try {
        if (error) {
            console.log(`Error - ${error.name}: ${error.message}`);
        }
        res.status(code).set('Content-Type', 'text/plain');
        res.send(msg);
    } catch (err) {
        console.log(`${err.name}: ${err.message}`);
    }
}


/**
 * reads a file from the filesystem (async) and calls the callback.
 * if the file does not exist or of illegal type, nothing happens.
 * @param  {string}  fileReq: relative file path to read
 * @param  {fn}  callback: the function to call when the data is ready
 * @return {boolean} true if the file was read (and therefore the callback will
 * be called), and false otherwise.
 */
function readLegalFile(fileReq, callback) {
    let suffix, legal = false, fileName;
    // get the file's suffix
    suffix = fileReq.split('.');
    if (suffix !== null) {
        suffix = suffix[suffix.length - 1];
    }
    // get the file's path relative to the FILES_DIR directory
    fileName = path.join(FILES_DIR, fileReq);
    // check if we support this file type
    if (suffix in SUFFIX_MIME) {
        legal = true;
    }
    if (!legal) {
        return false;
    } else {
        fs.readFile(fileName, callback);
        return true;
    }
}


/**
 * handles /hello/world/* requests
 */
app.use('/hello/world', (req, res) => {
    res.set('Content-Type', 'text/plain').send('hello world');
});


/**
 * handles adding (multiplying) the two given numbers
 * responds with json of the result
 * catches all of the form: /add/num1/num2/*
 */
app.use('/add/:n/:m', (req, res) => {
    try {
        let result = parseInt(req.params.n) * parseInt(req.params.m);
        res.json({ result: result });
    } catch (err) {
        errorExit(res, 500, 'Error in /add/:n/:m', err);
    }
});


/**
 * handles a file request from the server
 * matches /filez/<file-path> requests
 */
app.use(`/${FILES_DIR}/*file`, (req, res) => {
    let fileName = req.params.file,
        suffix = fileName.split('.'),
        success;
    // get the file's suffix
    suffix = suffix[suffix.length - 1];

    // read the file and send it
    success = readLegalFile(fileName, (err, data) => {
        // handle errors
        if (err) {
            errorExit(res, 404, `Could not read file: ${fileName}`, err);
            return;
        }
        // send the file
        res.set('Content-Length', data.length)
           .set('Content-Type', SUFFIX_MIME[suffix])
           .send(data);
    });
    if (!success) {
        errorExit(res, 404, `Invalid file: ${fileName}`);
    }
});

// start listening
server = app.start(PORT);
// console.log(`Listening on port: ${server.port}`);
