#!/usr/bin/env node
'use strict';

/*
 * Local Admin server + reverse proxy for Moshaver | مشاور.
 *
 * Why this exists:
 * - The Admin UI is intentionally usable from localhost.
 * - Modern browsers may restrict third-party/cross-site cookies when a localhost
 *   page talks directly to https://api.mahakaram.ir.
 * - Serving /api/v1 through the same localhost origin keeps the secure backend
 *   session model (HttpOnly cookie + CSRF) without storing auth tokens in web storage.
 *
 * Usage:
 *   node local-server.js --prod
 *   node local-server.js --local-api
 *   node local-server.js --prod --port=8081
 */

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var URLCtor = require('url').URL;

var ROOT = __dirname;
var args = process.argv.slice(2);
var port = 8081;
var target = 'https://api.mahakaram.ir';
var mode = 'production';

args.forEach(function(arg) {
  if (arg === '--local-api') { target = 'http://127.0.0.1:4000'; mode = 'local'; }
  else if (arg === '--prod') { target = 'https://api.mahakaram.ir'; mode = 'production'; }
  else if (arg.indexOf('--port=') === 0) {
    var n = parseInt(arg.slice(7), 10);
    if (isFinite(n) && n > 0 && n < 65536) port = n;
  }
});

var targetUrl = new URLCtor(target);
var transport = targetUrl.protocol === 'https:' ? https : http;

var MIME = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.ico':'image/x-icon'
};

function safeFile(urlPath) {
  var raw = String(urlPath || '/').split('?')[0];
  try { raw = decodeURIComponent(raw); } catch (e) {}
  if (raw === '/') raw = '/index.html';
  var clean = path.normalize(raw).replace(/^(\.\.[/\\])+/, '');
  clean = clean.replace(/^[/\\]+/, '');
  var file = path.join(ROOT, clean);
  if (file.indexOf(ROOT) !== 0) return null;
  return file;
}

function rewriteSetCookie(value) {
  if (!value) return value;
  var list = Array.isArray(value) ? value : [value];
  return list.map(function(cookie) {
    var out = String(cookie);
    // localhost is plain HTTP in this helper. Keep HttpOnly, but remove Secure.
    out = out.replace(/;\s*Secure\b/ig, '');
    // The local page and local proxy are same-site, so Lax is sufficient and
    // avoids third-party-cookie restrictions.
    out = out.replace(/;\s*SameSite=None\b/ig, '; SameSite=Lax');
    // A production cookie Domain must never be applied to localhost.
    out = out.replace(/;\s*Domain=[^;]+/ig, '');
    return out;
  });
}

function proxy(req, res) {
  var upstreamPath = req.url;
  var headers = {};
  Object.keys(req.headers || {}).forEach(function(k) { headers[k] = req.headers[k]; });
  headers.host = targetUrl.host;
  headers['x-forwarded-host'] = 'localhost:' + port;
  headers['x-forwarded-proto'] = 'http';

  var options = {
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: upstreamPath,
    headers: headers
  };

  var upstream = transport.request(options, function(up) {
    res.statusCode = up.statusCode || 502;
    Object.keys(up.headers || {}).forEach(function(name) {
      var lower = name.toLowerCase();
      if (lower === 'set-cookie' || lower === 'connection' || lower === 'transfer-encoding') return;
      try { res.setHeader(name, up.headers[name]); } catch (e) {}
    });
    if (up.headers['set-cookie']) res.setHeader('Set-Cookie', rewriteSetCookie(up.headers['set-cookie']));
    // The browser talks same-origin to localhost, so upstream CORS headers are not needed.
    res.removeHeader('Access-Control-Allow-Origin');
    res.removeHeader('Access-Control-Allow-Credentials');
    up.pipe(res);
  });

  upstream.on('error', function(err) {
    if (res.writableEnded) return;
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ok:false,error:{code:'LOCAL_PROXY_ERROR',message:'Backend proxy failed: '+err.message}}));
  });
  req.on('aborted', function(){ try{upstream.destroy();}catch(e){} });
  req.pipe(upstream);
}

function serve(req, res) {
  if (req.url.indexOf('/api/v1/') === 0 || req.url === '/api/v1') return proxy(req, res);

  if (req.url.split('?')[0] === '/config.js') {
    var config = [
      '(function(global){',
      "global.APP_CONFIG={API_BASE_URL:'/api/v1',APP_VERSION:'1.4.2',STUDENT_URL:'https://st.mahakaram.ir',ADMIN_URL:'http://localhost:"+port+"'};",
      '})(window);'
    ].join('\n');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(config);
  }

  var file = safeFile(req.url);
  if (!file) { res.statusCode = 400; return res.end('Bad request'); }
  fs.stat(file, function(err, st) {
    if (err || !st.isFile()) { res.statusCode = 404; return res.end('Not found'); }
    var ext = path.extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    if (['.html','.js','.json','.webmanifest'].indexOf(ext) >= 0) res.setHeader('Cache-Control','no-cache');
    fs.createReadStream(file).pipe(res);
  });
}

var server = http.createServer(serve);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.listen(port, '127.0.0.1', function() {
  console.log('');
  console.log('Moshaver | مشاور — Local Admin');
  console.log('Mode:    ' + mode);
  console.log('Admin:   http://localhost:' + port);
  console.log('API via: http://localhost:' + port + '/api/v1 -> ' + target);
  console.log('');
  console.log('Press Ctrl+C to stop.');
});
