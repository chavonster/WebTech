let json = 'application/json',
  html = 'text/html',
  CRLF = '\r\n',
  CONTENT_TYPE = 'Content-Type',
  CONTENT_LENGTH = 'Content-Length',
  COOKIE = 'Cookie',
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
let reHeader = /^(\w(?:\w|-)*)\s*:\s*(.*?)\s*$/g;

function Request() {
  this.locals = {
     headers: {}
   };
  this.body = null;
  this.cookies = {};
  this.host = '';
  this.method = '';
  this.params = {};
  this.path = '';
  this.protocol = 'http';
  this.query = {};

  this.get = (name) => this.locals.headers[name];

  this.param = (name) => {
    let result = this.locals.headers[name];
    if (result !== undefined) {
      return result;
    }
    return this.query[name];
  };

  this.is = (type) => {
    let match = null;
    if (this.locals.headers[CONTENT_TYPE] === undefined) {
      return false;
    } else {
      match = this.locals.headers[CONTENT_TYPE].match(type);
      if (match === null) {
        return false;
      } else {
        return true;
      }
    }
  };
}

function parseRequest(req_str) {
  let request = new Request(),
    lines = req_str.split(CRLF),
    firstLine = [],
    match = null,
    headers = {},
    query = {};
  firstLine = lines[0].split(/\s+/);
  request.method = firstLine[0];
  request.path = firstLine[1];
  lines = lines.splice(1);
  match = reHeader.exec(lines[0]);
  while (match !== null) {
    lines = lines.splice(1);
    headers[match[1]] = match[2];
    match = reHeader.exec(lines[0]);
  }
  request.locals.headers = headers;
  if (headers[CONTENT_LENGTH] !== undefined) {
    length = parseInt(headers[CONTENT_LENGTH]);
    lines = lines.join(CRLF);
    request.body = lines.slice(0, length);
  }
  return request;
}

module.exports = {
  html: html,
  json: json,

  parse: parseRequest,
  getInitialLine: (str, code) => {
    if (str == 'response') {
      if (code === undefined) {
        code = 404;
      }
      let description = CODES[code];
      if (description === undefined) {
        description = 'Other';
      }
      return 'HTTP/1.1 ' + code + description;
    } else {
      return 'GET /add/15/6/baz HTTP/1.1'; // TODO
    }
  },
  writeHeaders: (headers) => {
    let header_names = Object.keys(headers),
      headers_txt = '';
    for (let i = 0; i < header_names.length; ++i) {
      headers_txt += header_names[i] + ': ' + headers[header_names[i]];
      if (i < header_names.length - 1) {
        headers_txt += CRLF;
      }
    }
    return headers_txt;
  }
};
