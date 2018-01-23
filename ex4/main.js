// imports
const fs = require('fs'),
      path = require('path'),
      app = require('hujiwebserver');

// constants
const PORT = 8081,
      // location from which files will be read
      FILES_DIR = 'www',
      // legal types of suffix and their mime type
      SUFFIX_MIME = {
          'html': 'text/html',
          'css': 'text/css',
          'js': 'application/javascript'
      },
      // a mapping of each game option and its handler
      GAME_OPTIONS = {
          '0': (x) => {
              let old = copy_obj(x);
              x.zeros += 1;
              return old;
          },
          '1': (x) => {
              let old = copy_obj(x);
              x.ones += 1;
              return old;
          },
          'reset': (x) => {
              let old = copy_obj(x);
              x.zeros = 0;
              x.ones = 0;
              return old;
          }
      };

// global variables
let gambling = {'ones': 0, 'zeros': 0};


// helper functions
/**
 * create a new object with the same fields and values
 * as the given one. doesn't copy recursively.
 */
function copy_obj(obj) {
    let keys = Object.keys(obj),
        copy = {}, key;
    for (let i = 0; i < keys.length; ++i) {
        key = keys[i];
        copy[key] = obj[key];
    }
    return copy;
}

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


// main code


/**
 * handles user input from the web app
 */
app.use('/gamble/:option', (req, res) => {
    let option = req.params.option, handler, result;
    if (!(option in GAME_OPTIONS)) {
        errorExit(res, 404, `Illegal gamble option: ${option}`);
        return;
    }
    handler = GAME_OPTIONS[option];
    result = handler(gambling);
    res.json(result);
});


/**
 * reads a html/css/js file from the /www/ directory
 * and sends it as a response
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


// start the server
app.start(PORT, () => {
    // console.log(`Listening to port ${PORT}`);
});
