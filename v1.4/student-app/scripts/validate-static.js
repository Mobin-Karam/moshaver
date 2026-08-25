#!/usr/bin/env node
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.resolve(__dirname, "..");
var failures = [];
function fail(m){ failures.push(m); }
function exists(p){ return fs.existsSync(path.join(ROOT,p)); }
function read(p){ return fs.readFileSync(path.join(ROOT,p),"utf8"); }
function refs(html){ var out=[], re=/(?:src|href)="(\.\/[^"?#]+)/g,m; while((m=re.exec(html))) out.push(m[1].slice(2)); return out; }
var html=read("index.html");
refs(html).forEach(function(ref){ if(!exists(ref)) fail("index.html references missing asset: "+ref); });
var sw=read("sw.js"), shell=sw.match(/var SHELL=\[(.*?)\];/s);
if(!shell) fail("Could not parse service-worker shell list");
else { var re=/'([^']+)'/g,m; while((m=re.exec(shell[1]))){ var item=m[1].split("?",1)[0]; if(item==="./") continue; if(item.indexOf("./")===0)item=item.slice(2); if(!exists(item))fail("Service worker references missing asset: "+item); } }
["examHistoryList","learningSummary","learningPatterns","learningList","newLearningItemBtn","learningBtn"].forEach(function(id){ if(html.indexOf('id="'+id+'"')<0) fail("Required v1.6.0 UI target missing: "+id); });
var app=read("js/app.js");
["loadExamHistory","openAttemptReview","loadLearning","openLearningEditor","openLearningReview"].forEach(function(name){ if(app.indexOf("function "+name+"(")<0) fail("Required student function missing: "+name); });
var functionNames={}, duplicateFunctions=[]; var fnRe=/function\s+([A-Za-z_$][\w$]*)\s*\(/g; while((m=fnRe.exec(app))){ if(functionNames[m[1]])duplicateFunctions.push(m[1]); functionNames[m[1]]=true; }
if(duplicateFunctions.length) fail("Duplicate named student functions: "+Array.from(new Set(duplicateFunctions)).join(", "));
["refreshChatLatest","loadOlderChat","mergeChatMessage","binaryInsertUnique"].forEach(function(name){ if(app.indexOf("function "+name+"(")<0) fail("Required chat state function missing: "+name); });
if(read("css/app.css").indexOf("prefers-reduced-motion")<0) fail("Reduced-motion fallback is missing");
var ids={}, dup=[]; var idRe=/\sid="([^"]+)"/g,m; while((m=idRe.exec(html))){ if(ids[m[1]])dup.push(m[1]); ids[m[1]]=true; }
if(dup.length) fail("Duplicate HTML ids: "+Array.from(new Set(dup)).join(", "));
if(failures.length){ failures.forEach(function(m){console.error("FAIL "+m);}); process.exit(1); }
console.log("PASS student static integrity checks");
