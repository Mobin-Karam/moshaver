'use strict';
var fs=require('fs'),path=require('path'),vm=require('vm');
function assert(v,m){if(!v)throw new Error(m);}
function load(file){var context={window:{},document:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(file,'utf8'),context);return context.window.MoshaverChatMarkdown;}
['student-app','admin-app'].forEach(function(app){var md=load(path.resolve(__dirname,'..','..',app,'js','chat-markdown.js')),attack='<img src=x onerror=alert(1)><script>alert(2)</script>',safe=md.render(attack);assert(safe.indexOf('<img')<0&&safe.indexOf('<script')<0,'raw HTML escaped in '+app);assert(safe.indexOf('&lt;img')>=0&&safe.indexOf('&lt;script')>=0,'escaped HTML visible in '+app);var table=md.render('| درس | زمان |\n| --- | --- |\n| ریاضی | ۶۰ |');assert(table.indexOf('<table>')>=0&&table.indexOf('<th>درس</th>')>=0,'table rendered in '+app);var formatting=md.render('**پررنگ** *مورب* `کد` @student');assert(formatting.indexOf('<strong>')>=0&&formatting.indexOf('<em>')>=0&&formatting.indexOf('chat-mention')>=0,'limited markdown in '+app);});
console.log('CHAT MARKDOWN TEST PASSED: raw HTML escaped, limited formatting and responsive table markup rendered');
