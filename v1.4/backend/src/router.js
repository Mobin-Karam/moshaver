'use strict';

var url = require('url');

function Router() { this.routes = []; }

Router.prototype.add = function(method, pattern, roles, handler) {
  this.routes.push({ method: method.toUpperCase(), pattern: pattern, roles: roles || null, handler: handler });
};

Router.prototype.match = function(req) {
  var pathname = url.parse(req.url).pathname;
  var method = req.method.toUpperCase();
  for (var i = 0; i < this.routes.length; i++) {
    var r = this.routes[i];
    if (r.method !== method) continue;
    var m = pathname.match(r.pattern);
    if (m) return { route: r, match: m, pathname: pathname };
  }
  return null;
};

module.exports = Router;
