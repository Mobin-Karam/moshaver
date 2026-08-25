'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../v1.4');
function assert(ok,msg){if(!ok)throw new Error(msg);}
function txt(p){return fs.readFileSync(path.join(root,p),'utf8');}
const ah=txt('admin-app/index.html'),aj=txt('admin-app/js/admin.js'),sh=txt('student-app/index.html'),sj=txt('student-app/js/app.js'),server=txt('backend/src/server.js');
[
 'loginForm','studentSelect','quickImport','quickTomorrow','adminNotificationBtn','refreshDashboard','refreshLive','refreshChat','adminChatForm','adminChatInput','adminChatSend','importJsonBtn','createPlanBtn','plannerDate','publishRangeBtn','examJsonBtn','newExamBtn','examRetryPanel','examAdminList','newQuizBtn','messageStudentBtn','changePasswordBtn','previewImport'
].forEach(id=>assert(ah.includes('id="'+id+'"'),'Admin missing required control #'+id));
[
 'openImport','openAdminNotifications','openPlanForm','openTaskForm','publishRange','loadExams','openExamForm','openExamQuestions','loadExamRetryRequests','reviewExamRetry','previewImport','commitImport','sendAdminChat','boot'
].forEach(fn=>assert(new RegExp('function\\s+'+fn+'\\s*\\(').test(aj),'Admin function not implemented: '+fn));
[
 'loginForm','startNowBtn','notificationBtn','notificationsList','markAllNotifications','chatForm','chatInput','studentChatSend','examList','quizModal','quizBody','toastStack'
].forEach(id=>assert(sh.includes('id="'+id+'"'),'Student missing required control #'+id));
[
 'openExam','startExam','requestExamRetry','beginQuizRun','remainingQuizSeconds','loadNotifications','sendChat','restoreStudentAuth'
].forEach(fn=>assert(new RegExp('function\\s+'+fn+'\\s*\\(').test(sj),'Student function not implemented: '+fn));
assert(/DOMContentLoaded["'],\s*init/.test(aj)&&/else\s+init\(\)/.test(aj),'Admin must initialize on DOM ready');
assert(!/API_BASE_URL:\s*['\"]https:\/\/api\.mahakaram\.ir/.test(txt('admin-app/config.js')),'Admin browser API must stay same-origin');
assert(!/API_BASE_URL:\s*['\"]https:\/\/api\.mahakaram\.ir/.test(txt('student-app/config.js')),'Student browser API must stay same-origin');
assert(server.includes('Cache-Control, Pragma'),'CORS allow headers must include Cache-Control/Pragma for compatibility');
console.log('UI CONTRACT SMOKE PASSED: critical Admin/Student controls, functions, same-origin API, CORS compatibility.');
