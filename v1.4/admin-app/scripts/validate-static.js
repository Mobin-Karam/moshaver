#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname, "..");
var failures = [];

function fail(message) {
  failures.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function localRefs(html) {
  var refs = [];
  var re = /(?:src|href)="(\.\/[^"?#]+)/g;
  var match;
  while ((match = re.exec(html))) refs.push(match[1].slice(2));
  return refs;
}

var html = read("index.html");
localRefs(html).forEach(function (ref) {
  if (!exists(ref)) fail("index.html references missing asset: " + ref);
});

var sw = read("sw.js");
var shell = sw.match(/var SHELL=\[(.*?)\];self/);
if (!shell) {
  fail("Could not parse service-worker shell list");
} else {
  var re = /'([^']+)'/g;
  var match;
  while ((match = re.exec(shell[1]))) {
    var item = match[1].split("?", 1)[0];
    if (item === "./") continue;
    if (item.indexOf("./") === 0) item = item.slice(2);
    if (!exists(item)) fail("Service worker references missing asset: " + item);
  }
}

[
  "js/core/state.js",
  "js/core/connectivity.js",
  "js/components/forms.js",
  "js/components/modal.js",
  "js/utils/dates.js",
  "js/views/reports.js",
  "js/views/students.js",
  "js/views/subjects.js",
  "js/views/system.js",
].forEach(function (file) {
  if (!exists(file)) fail("Required admin module missing: " + file);
});

if (html.indexOf('class="skip-link"') < 0) fail("Skip link is missing");
if (html.indexOf('aria-modal="true"') < 0) fail("Modal accessibility attributes are missing");
if (html.indexOf('id="apiSource"') < 0 || html.indexOf('value="server"') < 0 || html.indexOf('value="local"') < 0) fail("Login API source selector is missing");
var apiClient=read("js/api-client.shared.js"),localServer=read("local-server.js");
if (apiClient.indexOf("setBase: setBase") < 0) fail("Runtime API base switching is missing");
if (localServer.indexOf("/api-server/v1") < 0 || localServer.indexOf("/api-local/v1") < 0) fail("Dual backend proxy routes are missing");
if (read("css/admin.css").indexOf("prefers-reduced-motion") < 0) {
  fail("Reduced-motion fallback is missing");
}
var adminApp=read("js/admin.js"), functionNames={}, duplicateFunctions=[], fnRe=/function\s+([A-Za-z_$][\w$]*)\s*\(/g, fnMatch;
while((fnMatch=fnRe.exec(adminApp))){ if(functionNames[fnMatch[1]])duplicateFunctions.push(fnMatch[1]); functionNames[fnMatch[1]]=true; }
if(duplicateFunctions.length) fail("Duplicate named admin functions: "+Array.from(new Set(duplicateFunctions)).join(", "));
["refreshAdminLatestMessages","loadOlderAdminChat","applyAdminReadReceipt","binaryInsertAdminMessage"].forEach(function(name){ if(adminApp.indexOf("function "+name+"(")<0) fail("Required admin chat state function missing: "+name); });

if (failures.length) {
  failures.forEach(function (message) {
    console.error("FAIL " + message);
  });
  process.exit(1);
}

console.log("PASS admin static integrity checks");
