// Imports
let url = require('url');

// Constants
const METHODS = ['GET', 'POST', 'PUT',
                 'DELETE', 'OPTIONS',
                 'TRACE', 'CONNECT'],
      html = 'text/html',
      json = 'application/json',
      HTTP_VER = 'HTTP/1.1',
      CRLF = '\r\n',
      NEWLINE = '\n',
      CODES = {
          100: "Continue",
          101: "Switching Protocols",
          102: "Processing",
          200: "OK",
          201: "Created",
          202: "Accepted",
          203: "Non-Authorative Information",
          204: "No Content",
          205: "Reset Content",
          206: "Partial Content",
          207: "Multi-Status",
          208: "Already Reported",
          226: "IM Used",
          300: "Multiple Choices",
          301: "Moved Permanently",
          302: "Found",
          303: "See Other",
          304: "Not Modified",
          305: "Use Proxy",
          306: "Switch Proxy",
          307: "Temoporary Redirect",
          308: "Permanenet Redirect",
          400: "Bad Reqeust",
          401: "Unauthorized",
          402: "Payment Required",
          403: "Forbidden",
          404: "Not Found",
          405: "Method Not Allowed",
          406: "Not Acceptable",
          408: "Request Time-out",
          409: "Conflict",
          410: "Gone",
          500: "Internal Server Error"
      };

// Regex
let reHeader = /^(\w(?:\w|-)*)\s*:\s*(.*?)\s*$/,
    reCookie = /^(cookie)$/i,
    reContent = /^(content-length)$/i,
    reHostName = /^(host)$/i,
    reHost = /^\s*([^:\s]+)\s*/;


/**
 * Prints an informative error message to the log
 * should be commented when submitted
 */
function printErrorMsg(err, funcName) {
    // console.log(`Error (${err.name}) in ${funcName}: ${err.message}`);
}


/**
 * check if the regex `re` matches one of the elements in the array `arr`.
 * if so, return the match array, otherwise return false
 */
function matchInArray(re, arr) {
    let match;
    // input check
    if (!re || !(re instanceof RegExp) ||
        !arr || !(arr instanceof Array)) {
        return false;
    }
    for (let i = 0; i < arr.length; ++i) {
        match = re.exec(arr[i]);
        if (match) {
            return match;
        }
    }
    return false;
}


// Request object constructor
function Request(headers, body, cookies, query, host, method, path) {
    // private
    let my_headers = headers;
    //public
    this.body = body;
    this.cookies = cookies;
    this.params = {};
    this.query = query;
    this.host = host;
    this.method = method;
    this.path = path;
    this.protocol = 'http';

    this.get = (name) => {
        try {
            let reName = new RegExp('(' + name + ')', 'i'),
                names = Object.keys(my_headers),
                match, result;
            match = matchInArray(reName, names);
            if (match) {
                result = my_headers[match[1]];
            }
            return result;
        } catch (err) {
            printErrorMsg(err, 'Request.get()');
        }
    };

    this.param = (name) => {
        if (name in this.params) {
            return this.params[name];
        } else if (name in this.query) {
            return this.query[name];
        }
    };

    this.is = (type) => {
        let contentType, reType;
        try {
            reType = new RegExp(type);
            contentType = this.get('Content-Type');
            return reType.test(contentType);
        } catch (err) {
            printErrorMsg(err, 'Request.is()');
            return false;
        }
    };
}

// Helper functions

function parseHeaders(lines, headers, cookies) {
    let line = '',
        headerName = null,
        headerVal = '',
        match = null;

    line = lines[0];
    lines = lines.splice(1);
    match = reHeader.exec(line);
    while (match !== null) {
        // check if this is a header decleration
        if (match.length === 3) {
            headerName = match[1];
            headerVal = match[2];
            headers[headerName] = headerVal;
        } // or a continuation of last header's value
        else if (match.length === 2 &&
                 headerName !== null) {
            headers[headerName] += match[1];
        }
        if (reCookie.test(headerName)) {
            parseCookie(cookies, headerVal);
        }
        // read next line
        line = lines[0];
        lines = lines.splice(1);
        match = reHeader.exec(line);
    }
    return lines;
}

function parseCookie(cookies, cookieStr) {
    try {
        let cookie = cookieStr.split(/\s*;\s*/), current;
        if (cookie === null) {
            return;
        }
        for (let i = 0; i < cookie.length; ++i) {
            current = cookie[i].split(/\s*=\s*/);
            if (current.length !== 2) {
                continue;
            }
            cookies[current[0]] = current[1];
        }
    } catch (err) {
        return;
    }
}

function parseHost(headers) {
    let names = Object.keys(headers),
        match, hostHeader, hostValue = null;
    // If there's a Host header, return its value
    // case insensitive
    match = matchInArray(reHostName, names);
    if (match) {
        hostHeader = match[1];
        match = reHost.exec(headers[hostHeader]);
        if (match) {
            hostValue = match[1];
        }
    }
    return hostValue;
}

function readBody(lines, headers) {
    let names = Object.keys(headers), match,
        length = 0,
        reqStr, body = null;
    // check for a content-length header, case insensitive
    match = matchInArray(reContent, names);
    if (match) {
        length = parseInt(headers[match[1]]);
        if (isNaN(length)) {
            length = 0;
        }
    }
    if (length > 0) {
        reqStr = lines.join(NEWLINE);
        length = Math.min(length, reqStr.length);
        // Read `length` bytes from the body
        body = Buffer.from(reqStr).toString(
            'utf8', start = 0, end = length);
    }
    return body;
}

function parseRequest(requestStr) {
    let cookies = {},
        headers = {},
        query, queryStr,
        requestLines, line,
        method, urlStr,
        protocol, path,
        host, match = null,
        header_name = null, header_val = '',
        body;

    // simple validity check on the request string
    if (typeof requestStr !== 'string') {
        return null;
    }
    requestLines = requestStr.split(NEWLINE);
    if (requestLines.length === 0) {
        return null;
    }

    // Read first line, split it by whitespaces
    line = requestLines[0].split(/\s+/);
    requestLines = requestLines.splice(1);
    method = line[0];
    urlStr = line[1];
    protocol = line[2];

    // make sure we're not handling nulls
    if (method === undefined ||
        !METHODS.includes(method) ||
        url === undefined ||
        protocol === undefined ||
        protocol !== HTTP_VER) {
        return null;
    }

    // get path and query string
    urlObj = url.parse(urlStr, parseQueryString = true);
    path = urlObj.pathname;
    query = urlObj.query;

    // get headers and host
    requestLines = parseHeaders(requestLines, headers, cookies);
    host = parseHost(headers);

    // if a newline exists after headers,
    // try to read the request body
    if (requestLines.length > 0 &&
        requestLines[0].match(/^\s*$/)) {
        // remove the empty line, 'fcourse
        requestLines = requestLines.splice(1);
        body = readBody(requestLines, headers);
    }

    return new Request(headers, body, cookies, query,
                       host, method, path);
}

function getResponseLine(code) {
    if (isNaN(code)) {
        code = 404;
    }
    let description = CODES[code];
    if (description === undefined) {
        description = 'Other';
    }
    return `${HTTP_VER} ${code} ${description}`;
}

function writeHeaders(headers) {
    let header_names = Object.keys(headers),
        headers_txt = '';
    for (let i = 0; i < header_names.length; ++i) {
        headers_txt += `${header_names[i]}: ${headers[header_names[i]]}`;
        if (i < header_names.length - 1) {
            headers_txt += CRLF;
        }
    }
    return headers_txt;
}

function writeResponse(headers, status_code, body) {
    // initial response line: -version- -code- -text-
    let response_txt = getResponseLine(status_code);
    // newline + headers
    response_txt += CRLF;
    response_txt += writeHeaders(headers);
    // if some headers were written, add another newline
    if (Object.keys(headers).length > 0) {
        response_txt += CRLF;
    }
    // write the body with a newline gap
    response_txt += CRLF + body + CRLF;
    return response_txt;
}

module.exports = {
    html: html,
    json: json,

    /*
     * Gets HTTP text and returns a request object, returns null if request
     * syntax is wrong
     */
    parse: parseRequest,

    writeResponse: writeResponse,
};
