'use strict';

var http = require('http');
var url = require('url');
var env = require('./env');
var database = require('./db');
var db = database.db;
var now = database.now;
var security = require('./security');
var Router = require('./router');

var realtime = require('./realtime');
var router = new Router();
var MAX_BODY = 1024 * 1024;
var rateBuckets = Object.create(null);

function send(res, status, payload) {
  if (res.writableEnded) return;
  var body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

function ok(res, data, status) { send(res, status || 200, { ok: true, data: data }); }
function fail(res, status, code, message, details) { send(res, status, { ok: false, error: { code: code, message: message, details: details || null } }); }

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if(env.production)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
}

function setCors(req, res) {
  var origin = req.headers.origin;
  if (!origin) return true;
  var allowed = env.corsOrigins.indexOf('*') >= 0 || env.corsOrigins.indexOf(origin) >= 0;
  if (!allowed) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, Cache-Control, Pragma');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

function parseBody(req, callback) {
  var chunks = [], size = 0, called = false;
  function done(err, body) { if (called) return; called = true; callback(err, body); }
  req.on('data', function(chunk) {
    size += chunk.length;
    if (size > MAX_BODY) { done(new Error('BODY_TOO_LARGE')); req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on('end', function() {
    if (called) return;
    if (!chunks.length) return done(null, {});
    try { done(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
    catch (e) { done(new Error('INVALID_JSON')); }
  });
  req.on('error', function(err) { done(err); });
}

function query(req) { return url.parse(req.url, true).query || {}; }
function str(v, max) { var s = v == null ? '' : String(v).trim(); return max ? s.slice(0, max) : s; }
function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : (fallback || 0); }
function boolInt(v) { return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0; }
function isoDateValid(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')); }
function timeValid(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')); }
function isMutating(method) { return ['POST','PUT','PATCH','DELETE'].indexOf(String(method||'').toUpperCase()) >= 0; }

function parseCookies(req) {
  var out = {}, raw = String(req.headers.cookie || '');
  raw.split(';').forEach(function(part){
    var i=part.indexOf('='); if(i<1)return;
    var k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
    try{out[k]=decodeURIComponent(v);}catch(e){out[k]=v;}
  });
  return out;
}
function cookieString(name,value,maxAge) {
  var parts=[name+'='+encodeURIComponent(value||''),'Path=/','HttpOnly','SameSite='+env.cookieSameSite];
  if(env.cookieSecure)parts.push('Secure');
  if(env.cookieDomain)parts.push('Domain='+env.cookieDomain);
  if(typeof maxAge==='number')parts.push('Max-Age='+Math.max(0,Math.floor(maxAge)));
  return parts.join('; ');
}
function setSessionCookie(res, token, maxAgeSeconds) { res.setHeader('Set-Cookie',cookieString(env.sessionCookieName,token,maxAgeSeconds)); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie',cookieString(env.sessionCookieName,'',0)); }
function clientIp(req) {
  if(env.trustProxy){var f=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();if(f)return f.slice(0,100);}
  return str(req.socket&&req.socket.remoteAddress,100)||'unknown';
}
function userAgent(req){return str(req.headers['user-agent'],300);}

function cleanupSessions() { db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now()); }

function authFromReq(req) {
  var cookies=parseCookies(req), token=cookies[env.sessionCookieName]||'', mode='cookie';
  if(!token && env.allowBearerAuth){var header=String(req.headers.authorization||'');if(header.indexOf('Bearer ')===0){token=header.slice(7).trim();mode='bearer';}}
  if (!token) return null;
  var row = db.prepare(`SELECT s.id AS session_id,s.expires_at,s.csrf_hash,s.csrf_token,s.ip_address,s.user_agent,u.id,u.username,u.role,u.display_name,u.student_id,u.is_active
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1`).get(security.hashToken(token));
  if (!row || !row.is_active || row.expires_at <= now()) return null;
  db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(now(), row.session_id);
  row.auth_mode=mode;
  return row;
}

function requireAuth(req, res, roles) {
  var user = authFromReq(req);
  if (!user) { fail(res, 401, 'UNAUTHORIZED', 'لطفاً وارد حساب شوید.'); return null; }
  if (roles && roles.length && roles.indexOf(user.role) < 0) { fail(res, 403, 'FORBIDDEN', 'دسترسی کافی ندارید.'); return null; }
  return user;
}
function ensureCsrf(sessionId) {
  var row=db.prepare('SELECT csrf_token FROM sessions WHERE id=?').get(sessionId);
  if(row&&row.csrf_token)return row.csrf_token;
  var raw=security.newCsrfToken();
  // Atomic lazy migration: concurrent /auth/me requests converge on the same token
  // instead of rotating the token and invalidating in-flight mutations.
  db.prepare(`UPDATE sessions SET csrf_token=?,csrf_hash=?
    WHERE id=? AND (csrf_token IS NULL OR csrf_token='')`).run(raw,security.hashToken(raw),sessionId);
  row=db.prepare('SELECT csrf_token FROM sessions WHERE id=?').get(sessionId);
  return row&&row.csrf_token?row.csrf_token:raw;
}
function validCsrf(req,user) {
  if(!user || user.auth_mode!=='cookie' || !isMutating(req.method))return true;
  // Logout is intentionally CSRF-exempt. With the HttpOnly SameSite session
  // cookie this can at worst sign the current browser out, and it makes logout
  // reliable even after a stale/cleared CSRF token.
  if(url.parse(req.url).pathname==='/api/v1/auth/logout')return true;
  var token=str(req.headers['x-csrf-token'],300);
  if(!token)return false;
  if(user.csrf_token)return security.safeEqualText(token,user.csrf_token);
  return !!user.csrf_hash && security.safeEqualText(security.hashToken(token),user.csrf_hash);
}

function audit(user, action, entityType, entityId, details) {
  try {
    db.prepare('INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(security.id('audit'), user ? user.id : null, action, entityType || null, entityId || null, JSON.stringify(details || {}), now());
  } catch (e) { console.error('audit failed:',e.message); }
}

function bucketAllow(key,max,windowMs){
  var t=Date.now(),b=rateBuckets[key];
  if(!b||t-b.start>=windowMs)b=rateBuckets[key]={start:t,count:0};
  b.count++; return b.count<=max;
}
function loginKeys(req,username){var ip=clientIp(req);return ['ip:'+ip,'login:'+ip+':'+String(username||'').toLowerCase()];}
function rateRow(key){return db.prepare('SELECT * FROM auth_rate_limits WHERE rate_key=?').get(key);}
function isLoginBlocked(keys){
  var t=Date.now();
  for(var i=0;i<keys.length;i++){var r=rateRow(keys[i]);if(r&&r.blocked_until&&new Date(r.blocked_until).getTime()>t)return r.blocked_until;}
  return null;
}
function loginFailure(keys){
  var t=new Date(),windowMs=env.loginWindowMinutes*60000,blockMs=env.loginBlockMinutes*60000;
  keys.forEach(function(key){
    var r=rateRow(key),start=r?new Date(r.window_started_at).getTime():0,failures=r?Number(r.failures||0):0;
    if(!r||Date.now()-start>windowMs){start=Date.now();failures=0;}
    failures++;
    var blocked=failures>=env.loginMaxFailures?new Date(Date.now()+blockMs).toISOString():null;
    db.prepare(`INSERT INTO auth_rate_limits (rate_key,failures,window_started_at,blocked_until,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(rate_key) DO UPDATE SET failures=excluded.failures,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at`)
      .run(key,failures,new Date(start).toISOString(),blocked,t.toISOString());
  });
}
function loginSuccess(keys){keys.forEach(function(k){db.prepare('DELETE FROM auth_rate_limits WHERE rate_key=?').run(k);});}
function getStudentIdForUser(user, requested) {
  if (user.role === 'student') return user.student_id;
  return requested || null;
}

function mapPlan(plan, studentId) {
  if (!plan) return null;
  var tasks = db.prepare(`SELECT t.*,tc.status AS completion_status,tc.actual_minutes,tc.actual_tests,tc.note AS completion_note
    FROM tasks t LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=?
    WHERE t.plan_id=? ORDER BY t.sort_order,t.start_time`).all(studentId, plan.id);
  return {
    id: plan.id,
    studentId: plan.student_id,
    planDate: plan.plan_date,
    jalaliId: plan.jalali_id,
    dayLabel: plan.day_label,
    persianDate: plan.persian_date,
    title: plan.title,
    motivationText: plan.motivation_text || '',
    published: !!plan.published,
    tasks: tasks.map(function(t) {
      return {
        id: t.id, start: t.start_time, end: t.end_time, type: t.type, subject: t.subject || '', title: t.title || '', pages: t.pages || '', testCount: t.test_count || 0, note: t.note || '', quizId: t.quiz_id || null, examId: t.exam_id || null, sortOrder: t.sort_order || 0,
        completion: t.completion_status ? { status: t.completion_status, actualMinutes: t.actual_minutes || 0, actualTests: t.actual_tests || 0, note: t.completion_note || '' } : null
      };
    })
  };
}

function getSubjects(studentId) {
  return db.prepare(`SELECT s.id,s.subject_key AS subjectKey,s.name,ss.status,ss.progress,ss.mastery,ss.note
    FROM subjects s LEFT JOIN student_subjects ss ON ss.subject_id=s.id AND ss.student_id=? ORDER BY s.display_order,s.name`).all(studentId);
}

function dateTimeValid(v){return !!v && !isNaN(new Date(v).getTime());}
function examDefaultOpen(e){return e.open_at||e.iso_date+'T00:00:00+03:30';}
function examDefaultClose(e){return e.close_at||e.iso_date+'T23:59:59+03:30';}
function examQuiz(examId){return db.prepare(`SELECT q.*,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS question_count FROM quizzes q WHERE q.exam_id=? AND q.active=1 ORDER BY q.created_at LIMIT 1`).get(examId)||null;}
function examAccess(e,studentId){
  var qz=examQuiz(e.id),attempts=0,activeRun=null,approved=0,pending=null,lastApproved=null;
  if(qz){
    attempts=Number(db.prepare('SELECT COUNT(*) AS n FROM quiz_attempts WHERE quiz_id=? AND student_id=?').get(qz.id,studentId).n||0);
    activeRun=db.prepare("SELECT * FROM quiz_runs WHERE quiz_id=? AND student_id=? AND status='active' ORDER BY started_at DESC LIMIT 1").get(qz.id,studentId)||null;
  }
  approved=Number(db.prepare("SELECT COUNT(*) AS n FROM exam_attempt_requests WHERE exam_id=? AND student_id=? AND status='approved'").get(e.id,studentId).n||0);
  pending=db.prepare("SELECT id,message,status,created_at AS createdAt FROM exam_attempt_requests WHERE exam_id=? AND student_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").get(e.id,studentId)||null;
  lastApproved=db.prepare("SELECT id,resolved_at AS resolvedAt,advisor_note AS advisorNote FROM exam_attempt_requests WHERE exam_id=? AND student_id=? AND status='approved' ORDER BY resolved_at DESC LIMIT 1").get(e.id,studentId)||null;
  var baseMax=Math.max(1,Number(e.max_attempts||1)),allowed=baseMax+approved,openAt=examDefaultOpen(e),closeAt=examDefaultClose(e),nowMs=Date.now(),inWindow=nowMs>=new Date(openAt).getTime()&&nowMs<=new Date(closeAt).getTime();
  var retryWindow=false;
  if(attempts>=baseMax&&attempts<allowed&&lastApproved&&lastApproved.resolvedAt){retryWindow=nowMs<=new Date(lastApproved.resolvedAt).getTime()+24*3600000;}
  var published=Number(e.published==null?1:e.published)===1,questionCount=qz?Number(qz.question_count||0):0,status=String(e.status||'upcoming');
  var canStart=published&&status!=='cancelled'&&status!=='completed'&&questionCount>0&&attempts<allowed&&(inWindow||retryWindow||!!activeRun);
  var reason='ready';
  if(!published)reason='not_published';else if(status==='cancelled')reason='cancelled';else if(status==='completed')reason='completed';else if(!qz||!questionCount)reason='no_questions';else if(activeRun)reason='resume';else if(attempts>=allowed)reason=pending?'retry_pending':'attempt_limit';else if(!inWindow&&!retryWindow)reason=nowMs<new Date(openAt).getTime()?'not_open':'closed';
  return {quiz:qz,questionCount:questionCount,attemptsUsed:attempts,maxAttempts:baseMax,approvedExtraAttempts:approved,allowedAttempts:allowed,activeRun:activeRun,openAt:openAt,closeAt:closeAt,inWindow:inWindow,retryWindow:retryWindow,canStart:canStart,reason:reason,retryRequest:pending,lastApproved:lastApproved};
}
function mapExam(e,studentId,adminMode){
  var access=studentId?examAccess(e,studentId):null;
  var item={id:e.id,title:e.title,persianDate:e.persian_date,isoDate:e.iso_date,note:e.note||'',status:e.status,studentId:e.student_id||'',openAt:examDefaultOpen(e),closeAt:examDefaultClose(e),durationMinutes:Math.max(1,Number(e.duration_minutes||120)),maxAttempts:Math.max(1,Number(e.max_attempts||1)),instructions:e.instructions||'',published:Number(e.published==null?1:e.published)===1,syllabus:db.prepare('SELECT id,subject_label AS subject,description,required,track FROM exam_syllabus WHERE exam_id=? ORDER BY rowid').all(e.id)};
  if(access){item.delivery={questionCount:access.questionCount,attemptsUsed:access.attemptsUsed,maxAttempts:access.maxAttempts,allowedAttempts:access.allowedAttempts,canStart:access.canStart,reason:access.reason,openAt:access.openAt,closeAt:access.closeAt,retryWindow:access.retryWindow,retryRequest:access.retryRequest,hasActiveRun:!!access.activeRun,quizId:access.quiz?access.quiz.id:null};}
  if(adminMode&&access){item.delivery.lastApproved=access.lastApproved;}
  return item;
}
function getExams(studentId,adminMode){
  var exams;
  if(studentId) exams=db.prepare('SELECT * FROM exams WHERE student_id=? OR student_id IS NULL ORDER BY iso_date,created_at').all(studentId);
  else exams=db.prepare('SELECT * FROM exams ORDER BY iso_date,created_at').all();
  return exams.map(function(e){return mapExam(e,studentId,!!adminMode);});
}
function quizPayload(qz){
  var out={id:qz.id,title:qz.title,subject:qz.subject||'',durationMinutes:Number(qz.duration_minutes||qz.durationMinutes||20),examId:qz.exam_id||qz.examId||null};
  out.questions=db.prepare('SELECT id,question_text AS question,option_a,option_b,option_c,option_d,sort_order FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order').all(qz.id).map(function(x){return{id:x.id,question:x.question,options:[x.option_a,x.option_b,x.option_c,x.option_d]};});
  return out;
}
function createOrResumeQuizRun(qz,studentId,deviceLabel){
  var active=db.prepare("SELECT * FROM quiz_runs WHERE student_id=? AND quiz_id=? AND status='active' ORDER BY started_at DESC LIMIT 1").get(studentId,qz.id);
  if(active)return {runId:active.id,startedAt:active.started_at,quiz:quizPayload(qz),resumed:true};
  var runId=security.id('quizrun'),t=now();db.prepare("INSERT INTO quiz_runs (id,quiz_id,student_id,started_at,submitted_at,status,created_at) VALUES (?,?,?,?,NULL,'active',?)").run(runId,qz.id,studentId,t,t);
  touchPresence(studentId,'quiz',null,null,str(deviceLabel,120));recordActivity(studentId,'quiz.started','quiz',qz.id,{runId:runId});
  return {runId:runId,startedAt:t,quiz:quizPayload(qz),resumed:false};
}

function getReport(studentId, date) {
  return db.prepare('SELECT * FROM daily_reports WHERE student_id=? AND plan_date=?').get(studentId, date) || null;
}

function syllabusWeight(status) {
  var map = { unread:0, read:25, tested:55, review:75, mastered:100 };
  return Object.prototype.hasOwnProperty.call(map,status) ? map[status] : 0;
}

function getExamProgress(studentId, examId) {
  var exam=db.prepare('SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(examId,studentId);if(!exam)return null;
  var rows=db.prepare(`SELECT es.id,es.subject_label AS subject,es.description,es.required,es.track,COALESCE(sp.status,'unread') AS progress_status,COALESCE(sp.accuracy,0) AS accuracy,COALESCE(sp.note,'') AS progress_note FROM exam_syllabus es LEFT JOIN syllabus_progress sp ON sp.syllabus_id=es.id AND sp.student_id=? WHERE es.exam_id=? ORDER BY es.rowid`).all(studentId,examId),total=0;
  rows.forEach(function(r){total+=syllabusWeight(r.progress_status);});
  var mapped=mapExam(exam,studentId,false);mapped.readiness=rows.length?Math.round(total/rows.length):0;mapped.syllabus=rows.map(function(r){return{id:r.id,subject:r.subject,description:r.description,required:!!r.required,track:r.track||'',status:r.progress_status,accuracy:r.accuracy,note:r.progress_note||''};});return mapped;
}

function getPlanMetrics(plan) {
  if (!plan) return {totalTasks:0,doneTasks:0,partialTasks:0,plannedMinutes:0,actualMinutes:0,plannedTests:0,actualTests:0};
  var total=plan.tasks.length,doneN=0,partial=0,plannedM=0,actualM=0,plannedT=0,actualT=0;
  plan.tasks.forEach(function(t){
    var a=String(t.start||'00:00').split(':'),b=String(t.end||'00:00').split(':');
    var m=(Number(b[0])*60+Number(b[1]))-(Number(a[0])*60+Number(a[1]));if(m>0)plannedM+=m;
    plannedT+=Number(t.testCount||0);
    if(t.completion){if(t.completion.status==='done')doneN++;else if(t.completion.status==='partial')partial++;actualM+=Number(t.completion.actualMinutes||0);actualT+=Number(t.completion.actualTests||0);}
  });
  return {totalTasks:total,doneTasks:doneN,partialTasks:partial,plannedMinutes:plannedM,actualMinutes:actualM,plannedTests:plannedT,actualTests:actualT};
}

function getMistakes(studentId, limit) {
  var n=Math.min(200,Math.max(1,Number(limit||80)));
  return db.prepare(`SELECT qa.id,qa.attempt_id AS attemptId,qa.question_id AS questionId,qa.selected_option AS selectedOption,
    qa.error_reason AS errorReason,qq.correct_option AS correctOption,qq.question_text AS question,qq.explanation,
    q.title AS quizTitle,q.subject,att.submitted_at AS submittedAt
    FROM quiz_answers qa JOIN quiz_attempts att ON att.id=qa.attempt_id JOIN quiz_questions qq ON qq.id=qa.question_id
    JOIN quizzes q ON q.id=att.quiz_id WHERE att.student_id=? AND qa.is_correct=0 ORDER BY att.submitted_at DESC LIMIT ?`).all(studentId,n);
}

function studentDashboard(studentId, date, includeDraft) {
  var student = db.prepare('SELECT * FROM students WHERE id=?').get(studentId);
  if (!student) return null;
  var sql = 'SELECT * FROM plans WHERE student_id=? AND plan_date=?' + (includeDraft ? '' : ' AND published=1') + ' LIMIT 1';
  var plan = db.prepare(sql).get(studentId, date);
  var nextExam = db.prepare('SELECT * FROM exams WHERE iso_date>=? AND published=1 AND status<>\'cancelled\' AND (student_id=? OR student_id IS NULL) ORDER BY iso_date,open_at LIMIT 1').get(date,studentId);
  var recent = db.prepare('SELECT * FROM quiz_attempts WHERE student_id=? ORDER BY submitted_at DESC LIMIT 6').all(studentId);
  return {
    student: { id: student.id, name: student.name, grade: student.grade, major: student.major, targetMajor: student.target_major, targetCity: student.target_city, rankGoal: student.rank_goal, dailyCapacity: student.daily_capacity },
    plan: mapPlan(plan, studentId),
    planMetrics: getPlanMetrics(mapPlan(plan, studentId)),
    subjects: getSubjects(studentId),
    nextExam: nextExam ? getExamProgress(studentId,nextExam.id) : null,
    latestReport: getReport(studentId, date),
    unreadNotifications: db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE student_id=? AND is_read=0').get(studentId).n,
    pendingRecovery: db.prepare("SELECT COUNT(*) AS n FROM recovery_requests WHERE student_id=? AND status='pending'").get(studentId).n,
    recentAttempts: recent.map(function(r){ return { id:r.id, quizId:r.quiz_id, correct:r.correct, wrong:r.wrong, blank:r.blank, percent:r.percent, submittedAt:r.submitted_at }; })
  };
}


function safeJsonParse(value, fallback) {
  try { return JSON.parse(value || ''); } catch (e) { return fallback == null ? {} : fallback; }
}

function todayIso() { return new Date().toISOString().slice(0,10); }
function addIsoDays(date, days) {
  var d = new Date(String(date || todayIso()) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0,10);
}

function emitAdmin(studentId,type,payload){try{return realtime.emit(db,'admin',studentId,type,payload,now);}catch(e){console.error('realtime admin emit failed:',e.message);return null;}}
function emitStudent(studentId,type,payload){try{return realtime.emit(db,'student',studentId,type,payload,now);}catch(e){console.error('realtime student emit failed:',e.message);return null;}}

function recordActivity(studentId, eventType, entityType, entityId, metadata) {
  if (!studentId || !eventType) return;
  var item={studentId:studentId,eventType:str(eventType,80),entityType:entityType?str(entityType,80):'',entityId:entityId?str(entityId,120):'',metadata:metadata||{},createdAt:now()};
  try {
    db.prepare('INSERT INTO activity_events (id,student_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(security.id('event'), studentId, item.eventType, item.entityType||null, item.entityId||null, JSON.stringify(item.metadata), item.createdAt);
    emitAdmin(studentId,item.eventType,item);
  } catch (e) { console.error('activity insert failed:',e.message); }
}

function notifyStudent(studentId, title, body) {
  if (!studentId) return;
  try {
    var id=security.id('notification'),t=now(),item={id:id,title:str(title,160),body:str(body,1000),isRead:false,createdAt:t};
    db.prepare('INSERT INTO notifications (id,student_id,title,body,is_read,created_at) VALUES (?,?,?,?,0,?)').run(id,studentId,item.title,item.body,t);
    emitStudent(studentId,'notification.created',item);
  } catch(e) { console.error('notification insert failed:',e.message); }
}

function touchPresence(studentId, state, taskId, sessionId, deviceLabel) {
  var previous=db.prepare('SELECT * FROM student_presence WHERE student_id=?').get(studentId),t=now(),nextState=str(state,30)||'online';
  db.prepare(`INSERT INTO student_presence (student_id,state,active_task_id,active_session_id,last_seen_at,device_label) VALUES (?,?,?,?,?,?)
    ON CONFLICT(student_id) DO UPDATE SET state=excluded.state,active_task_id=excluded.active_task_id,active_session_id=excluded.active_session_id,last_seen_at=excluded.last_seen_at,device_label=excluded.device_label`)
    .run(studentId,nextState,taskId||null,sessionId||null,t,str(deviceLabel,120));
  var result=getPresence(studentId);
  if(!previous||previous.state!==nextState||(previous.active_task_id||null)!==(taskId||null)||(previous.active_session_id||null)!==(sessionId||null))emitAdmin(studentId,'presence.changed',result);
  return result;
}

function getPresence(studentId) {
  var p=db.prepare('SELECT * FROM student_presence WHERE student_id=?').get(studentId);
  if(!p)return {studentId:studentId,state:'offline',online:false,lastSeenAt:null,activeTaskId:null,activeSessionId:null,deviceLabel:''};
  var age=Date.now()-new Date(p.last_seen_at).getTime();
  return {studentId:studentId,state:p.state,online:age<120000,lastSeenAt:p.last_seen_at,activeTaskId:p.active_task_id||null,activeSessionId:p.active_session_id||null,deviceLabel:p.device_label||''};
}

function activeStudySession(studentId) {
  var r=db.prepare(`SELECT ss.*,t.subject,t.title,t.start_time,t.end_time FROM study_sessions ss LEFT JOIN tasks t ON t.id=ss.task_id
    WHERE ss.student_id=? AND ss.status='active' ORDER BY ss.started_at DESC LIMIT 1`).get(studentId);
  if(!r)return null;
  return {id:r.id,studentId:r.student_id,taskId:r.task_id||null,startedAt:r.started_at,lastHeartbeatAt:r.last_heartbeat_at,status:r.status,subject:r.subject||'',title:r.title||'',plannedStart:r.start_time||'',plannedEnd:r.end_time||'',note:r.note||''};
}

function mapActivityRows(rows) {
  return rows.map(function(r){return {id:r.id,studentId:r.student_id,eventType:r.event_type,entityType:r.entity_type||'',entityId:r.entity_id||'',metadata:safeJsonParse(r.metadata_json,{}),createdAt:r.created_at};});
}


function iranDayBounds(date) {
  var start=new Date(String(date)+'T00:00:00+03:30');
  var end=new Date(start.getTime()+86400000);
  return {start:start.toISOString(),end:end.toISOString()};
}
function objectiveDailyMetrics(studentId,date) {
  var b=iranDayBounds(date);
  var study=db.prepare("SELECT COALESCE(SUM(actual_minutes),0) AS minutes FROM study_sessions WHERE student_id=? AND status='finished' AND started_at>=? AND started_at<?").get(studentId,b.start,b.end);
  var quiz=db.prepare("SELECT COALESCE(SUM(correct),0) AS correct,COALESCE(SUM(wrong),0) AS wrong,COALESCE(SUM(blank),0) AS blank FROM quiz_attempts WHERE student_id=? AND submitted_at>=? AND submitted_at<?").get(studentId,b.start,b.end);
  var minutes=Number(study.minutes||0),correct=Number(quiz.correct||0),wrong=Number(quiz.wrong||0),blank=Number(quiz.blank||0);
  return {studyMinutes:minutes,studyHours:(minutes/60).toFixed(1),tests:correct+wrong+blank,correct:correct,wrong:wrong,blank:blank};
}

function getOrCreateConversation(studentId) {
  var c=db.prepare('SELECT * FROM chat_conversations WHERE student_id=?').get(studentId);
  if(c)return c;
  var t=now(),id=security.id('conv');
  db.prepare('INSERT INTO chat_conversations (id,student_id,created_at,updated_at,last_message_at) VALUES (?,?,?,?,NULL)').run(id,studentId,t,t);
  return db.prepare('SELECT * FROM chat_conversations WHERE id=?').get(id);
}
function canUseConversation(user,conversationId) {
  var c=db.prepare('SELECT * FROM chat_conversations WHERE id=?').get(conversationId);
  if(!c)return null;
  if(user.role==='admin')return c;
  return user.student_id===c.student_id?c:null;
}
function getReadAt(conversationId,userId){var r=db.prepare('SELECT last_read_at FROM chat_reads WHERE conversation_id=? AND user_id=?').get(conversationId,userId);return r?r.last_read_at:null;}
function markConversationRead(conversationId,user) {
  var t=now();
  db.prepare(`INSERT INTO chat_reads (conversation_id,user_id,last_read_at) VALUES (?,?,?) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_at=excluded.last_read_at`).run(conversationId,user.id,t);
  return t;
}
function conversationUnread(conversationId,user) {
  var readAt=getReadAt(conversationId,user.id)||'0000-01-01T00:00:00.000Z';
  return db.prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id=? AND sender_user_id<>? AND deleted_at IS NULL AND created_at>?').get(conversationId,user.id,readAt).n;
}
function mapChatMessage(row,otherReadAt,viewerUserId) {
  return {id:row.id,conversationId:row.conversation_id,senderUserId:row.sender_user_id,senderRole:row.sender_role,senderName:row.sender_name||'',text:row.message_text,replyToId:row.reply_to_id||null,createdAt:row.created_at,editedAt:row.edited_at||null,deletedAt:row.deleted_at||null,seen:!!(viewerUserId&&row.sender_user_id===viewerUserId&&otherReadAt&&row.created_at<=otherReadAt)};
}
function chatMessages(conversationId,limit) {
  var n=Math.min(100,Math.max(1,Number(limit||50)));
  var rows=db.prepare(`SELECT cm.*,u.display_name AS sender_name FROM chat_messages cm JOIN users u ON u.id=cm.sender_user_id WHERE cm.conversation_id=? ORDER BY cm.created_at DESC,cm.id DESC LIMIT ?`).all(conversationId,n).reverse();
  return rows;
}
function adminChatList(adminUser) {
  var students=db.prepare('SELECT id,name,grade FROM students WHERE active=1 ORDER BY name').all();
  return students.map(function(st){
    var c=getOrCreateConversation(st.id),last=db.prepare(`SELECT cm.*,u.display_name AS sender_name FROM chat_messages cm JOIN users u ON u.id=cm.sender_user_id WHERE cm.conversation_id=? AND cm.deleted_at IS NULL ORDER BY cm.created_at DESC,cm.id DESC LIMIT 1`).get(c.id);
    return {id:c.id,student:{id:st.id,name:st.name,grade:st.grade},lastMessage:last?mapChatMessage(last,null,adminUser.id):null,unread:conversationUnread(c.id,adminUser),presence:getPresence(st.id)};
  });
}

function getDueReviews(studentId, limit) {
  return db.prepare(`SELECT r.id,r.due_date AS dueDate,r.interval_days AS intervalDays,r.status,r.completed_at AS completedAt,
    es.subject_label AS subject,es.description,e.title AS examTitle,e.id AS examId,r.syllabus_id AS syllabusId
    FROM review_items r LEFT JOIN exam_syllabus es ON es.id=r.syllabus_id LEFT JOIN exams e ON e.id=es.exam_id
    WHERE r.student_id=? AND r.status='pending' AND r.due_date<=? ORDER BY r.due_date LIMIT ?`).all(studentId,todayIso(),Math.min(100,Math.max(1,Number(limit||20))));
}

function scheduleReviews(studentId, syllabusId, baseDate) {
  var intervals=[1,3,7,14],t=now();
  intervals.forEach(function(days){
    db.prepare(`INSERT OR IGNORE INTO review_items (id,student_id,syllabus_id,due_date,interval_days,status,completed_at,created_at)
      VALUES (?,?,?,?,?,'pending',NULL,?)`).run(security.id('review'),studentId,syllabusId,addIsoDays(baseDate||todayIso(),days),days,t);
  });
}

function normalizeImportPayload(input, fallbackStudentId) {
  var src=input&&typeof input==='object'?input:{},errors=[],warnings=[],conflicts=[];
  var studentId=str(fallbackStudentId||src.studentId,120);
  if(!studentId)errors.push('studentId is required.');
  if(studentId&&!db.prepare('SELECT id FROM students WHERE id=?').get(studentId))errors.push('Student not found: '+studentId);
  var plans=[],planSeen={};
  (Array.isArray(src.plans)?src.plans:[]).forEach(function(p,pi){
    var date=str(p.planDate,10);if(!isoDateValid(date)){errors.push('plans['+pi+'].planDate must be YYYY-MM-DD.');return;}
    if(planSeen[date])warnings.push('Duplicate imported plan date: '+date);planSeen[date]=1;
    var tasks=[];(Array.isArray(p.tasks)?p.tasks:[]).forEach(function(t,ti){
      var st=str(t.start,5),en=str(t.end,5);if(!timeValid(st)||!timeValid(en)){errors.push('Invalid time in '+date+' task '+(ti+1));return;}
      if(en<=st)warnings.push('Task end time is not after start time: '+date+' '+st+'-'+en);
      tasks.push({start:st,end:en,type:str(t.type,30)||'study',subject:str(t.subject,150),title:str(t.title,300),pages:str(t.pages,120),testCount:Math.max(0,num(t.testCount,0)),note:str(t.note,1500),quizId:str(t.quizId,120)||null,examId:str(t.examId,120)||null,examRef:str(t.examRef,120)||null,sortOrder:num(t.sortOrder,ti+1)});
    });
    for(var a=0;a<tasks.length;a++)for(var b=a+1;b<tasks.length;b++)if(tasks[a].start<tasks[b].end&&tasks[b].start<tasks[a].end)conflicts.push(date+': '+tasks[a].start+'-'+tasks[a].end+' overlaps '+tasks[b].start+'-'+tasks[b].end);
    if(studentId&&db.prepare('SELECT id FROM plans WHERE student_id=? AND plan_date=?').get(studentId,date))warnings.push('Existing plan found for '+date+'.');
    plans.push({planDate:date,jalaliId:str(p.jalaliId,40),dayLabel:str(p.dayLabel,60),persianDate:str(p.persianDate,100),title:str(p.title,250),motivationText:str(p.motivationText||p.motivation,600),published:!!p.published,tasks:tasks});
  });
  var exams=[],questionCount=0;
  (Array.isArray(src.exams)?src.exams:[]).forEach(function(e,ei){
    var date=str(e.isoDate,10),title=str(e.title,250);if(!title||!isoDateValid(date)){errors.push('exams['+ei+'] needs title and isoDate.');return;}
    var openAt=str(e.openAt,80)||date+'T08:00:00+03:30',closeAt=str(e.closeAt,80)||date+'T13:00:00+03:30';
    if(!dateTimeValid(openAt)||!dateTimeValid(closeAt)||new Date(closeAt)<=new Date(openAt)){errors.push('exams['+ei+'] has invalid openAt/closeAt.');return;}
    var syllabus=[];(Array.isArray(e.syllabus)?e.syllabus:[]).forEach(function(x){if(str(x.subject,150)&&str(x.description,1200))syllabus.push({subject:str(x.subject,150),description:str(x.description,1200),required:x.required!==false,track:str(x.track,120)});});
    var rawQuestions=Array.isArray(e.questions)?e.questions:(e.quiz&&Array.isArray(e.quiz.questions)?e.quiz.questions:[]),questions=[];
    rawQuestions.forEach(function(x,qi){var opts=Array.isArray(x.options)?x.options:[];var co=str(x.correctOption||x.answer,20).toLowerCase();if(/^[0-3]$/.test(co))co=['a','b','c','d'][Number(co)];if(!str(x.question||x.q,2000)||opts.length!==4||['a','b','c','d'].indexOf(co)<0){errors.push('exams['+ei+'].questions['+qi+'] needs question, 4 options, correctOption a/b/c/d.');return;}questions.push({question:str(x.question||x.q,2000),options:[str(opts[0],1000),str(opts[1],1000),str(opts[2],1000),str(opts[3],1000)],correctOption:co,explanation:str(x.explanation,2000),sortOrder:num(x.sortOrder,qi+1)});});
    questionCount+=questions.length;
    if(studentId&&db.prepare('SELECT id FROM exams WHERE student_id=? AND title=? AND iso_date=? LIMIT 1').get(studentId,title,date))warnings.push('Existing exam found: '+title+' '+date+'.');
    exams.push({ref:str(e.ref,120)||null,title:title,persianDate:str(e.persianDate,100)||date,isoDate:date,note:str(e.note,1500),status:str(e.status,30)||'upcoming',published:e.published!==false,openAt:openAt,closeAt:closeAt,durationMinutes:Math.max(1,num(e.durationMinutes,120)),maxAttempts:1,instructions:str(e.instructions,3000),syllabus:syllabus,questions:questions});
  });
  var knownExamRefs={};exams.forEach(function(e){if(e.ref){if(knownExamRefs[e.ref])errors.push('Duplicate exam ref: '+e.ref);knownExamRefs[e.ref]=1;}});
  plans.forEach(function(p){p.tasks.forEach(function(t){if(t.examRef&&!knownExamRefs[t.examRef])errors.push('Unknown examRef '+t.examRef+' in plan '+p.planDate+'.');});});
  var taskCount=0;plans.forEach(function(p){taskCount+=p.tasks.length;});
  return {schemaVersion:Number(src.schemaVersion||2),studentId:studentId,plans:plans,exams:exams,summary:{plans:plans.length,tasks:taskCount,exams:exams.length,questions:questionCount,conflicts:conflicts.length},errors:errors,warnings:warnings,conflicts:conflicts};
}

function commitImport(normalized, options, user) {
  if(normalized.errors.length)throw new Error('IMPORT_VALIDATION');
  var opts=options||{},t=now(),studentId=normalized.studentId,createdPlans=0,createdTasks=0,createdExams=0,createdQuestions=0,examRefMap={};
  db.exec('BEGIN IMMEDIATE');
  try {
    // Exams are created first so a plan task can reference an exam from the same JSON via examRef.
    normalized.exams.forEach(function(e){
      var existing=db.prepare('SELECT id FROM exams WHERE student_id=? AND title=? AND iso_date=? LIMIT 1').get(studentId,e.title,e.isoDate);
      if(existing){if(!opts.replaceExistingExams)throw new Error('EXAM_EXISTS:'+e.title);db.prepare('DELETE FROM exams WHERE id=?').run(existing.id);}
      var eid=security.id('exam');db.prepare('INSERT INTO exams (id,title,persian_date,iso_date,note,status,created_at,updated_at,student_id,open_at,close_at,duration_minutes,max_attempts,instructions,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(eid,e.title,e.persianDate,e.isoDate,e.note,e.status,t,t,studentId,e.openAt,e.closeAt,e.durationMinutes,e.maxAttempts,e.instructions,(opts.publishImported||e.published)?1:0);
      if(e.ref)examRefMap[e.ref]=eid;
      // Also allow a convenient automatic same-date/title reference for generated JSON.
      examRefMap[e.isoDate+'|'+e.title]=eid;
      e.syllabus.forEach(function(x){db.prepare('INSERT INTO exam_syllabus (id,exam_id,subject_label,description,required,track) VALUES (?,?,?,?,?,?)').run(security.id('syllabus'),eid,x.subject,x.description,x.required?1:0,x.track);});
      var qid=security.id('quiz');db.prepare('INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)').run(qid,e.title,'آزمون اصلی',e.durationMinutes,eid,t,t);
      e.questions.forEach(function(x){db.prepare('INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)').run(security.id('question'),qid,x.question,x.options[0],x.options[1],x.options[2],x.options[3],x.correctOption,x.explanation,x.sortOrder);createdQuestions++;});createdExams++;
    });
    normalized.plans.forEach(function(p){
      var existing=db.prepare('SELECT id FROM plans WHERE student_id=? AND plan_date=?').get(studentId,p.planDate);
      if(existing){if(!opts.replaceExistingPlans)throw new Error('PLAN_EXISTS:'+p.planDate);db.prepare('DELETE FROM plans WHERE id=?').run(existing.id);}
      var pid=security.id('plan');db.prepare('INSERT INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(pid,studentId,p.planDate,p.jalaliId,p.dayLabel,p.persianDate,p.title,p.motivationText||'',opts.publishImported?1:(p.published?1:0),t,t);
      p.tasks.forEach(function(x,idx){
        var linkedExamId=x.examId||null;
        if(!linkedExamId&&x.examRef)linkedExamId=examRefMap[x.examRef]||null;
        if(!linkedExamId&&x.type==='exam')linkedExamId=examRefMap[p.planDate+'|'+x.title]||null;
        if(linkedExamId&&!db.prepare('SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(linkedExamId,studentId))linkedExamId=null;
        db.prepare(`INSERT INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(security.id('task'),pid,x.start,x.end,x.type,x.subject,x.title,x.pages,x.testCount,x.note,x.quizId,linkedExamId,x.sortOrder||idx+1,t,t);createdTasks++;
      });createdPlans++;
    });
    var iid=security.id('import');db.prepare('INSERT INTO data_imports (id,student_id,source_name,plan_count,task_count,exam_count,published,summary_json,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(iid,studentId,str(opts.sourceName,200)||'JSON import',createdPlans,createdTasks,createdExams,opts.publishImported?1:0,JSON.stringify(normalized.summary),user.id,t);
    db.exec('COMMIT');
    if(opts.publishImported){notifyStudent(studentId,'برنامه و آزمون جدید','اطلاعات جدید توسط مشاور منتشر شد.');emitStudent(studentId,'plan.published',{studentId:studentId,source:'json-import',plans:createdPlans,exams:createdExams});emitStudent(studentId,'exam.updated',{studentId:studentId,exams:createdExams});}
    audit(user,'import','student_data',iid,{studentId:studentId,plans:createdPlans,tasks:createdTasks,exams:createdExams,questions:createdQuestions,published:!!opts.publishImported});
    return {importId:iid,studentId:studentId,plans:createdPlans,tasks:createdTasks,exams:createdExams,questions:createdQuestions,published:!!opts.publishImported};
  } catch(e){try{db.exec('ROLLBACK');}catch(x){}throw e;}
}

function healthPayload() {
  var check = db.prepare('SELECT 1 AS ok').get();
  return {
    status: check.ok === 1 ? 'ok' : 'error',
    database: check.ok === 1 ? 'connected' : 'error',
    version: env.version,
    time: now()
  };
}

// Public root and health endpoints are intentionally simple so PaaS/gateway
// health checks can verify the service without authentication.
router.add('GET', /^\/$/, null, function(req,res) {
  ok(res, {
    name: env.appName + ' API',
    version: env.version,
    status: 'ok',
    health: '/health',
    apiHealth: '/api/v1/health'
  });
});

router.add('GET', /^\/health$/, null, function(req,res) {
  ok(res, healthPayload());
});

router.add('GET', /^\/ready$/, null, function(req,res) {
  ok(res, healthPayload());
});

router.add('GET', /^\/api\/v1\/health$/, null, function(req,res) {
  ok(res, healthPayload());
});

router.add('GET', /^\/api\/v1\/ready$/, null, function(req,res) {
  ok(res, healthPayload());
});

router.add('GET', /^\/api\/v1\/public\/app-version\/([^/]+)$/, null, function(req,res,match) {
  var row = db.prepare('SELECT * FROM app_versions WHERE app_name=?').get(match[1]);
  var rel = row ? db.prepare('SELECT notes FROM app_releases WHERE app_name=? AND version=?').get(row.app_name,row.version) : null;
  ok(res, row ? { app: row.app_name, version: row.version, notes:rel?rel.notes:'', updatedAt: row.updated_at } : { app: match[1], version: env.version, notes:'', updatedAt: null });
});

router.add('POST', /^\/api\/v1\/auth\/login$/, null, async function(req,res,match,body) {
  var username=str(body.username,100),password=str(body.password,300),keys=loginKeys(req,username),blocked=isLoginBlocked(keys);
  if(!username||!password)return fail(res,400,'VALIDATION','نام کاربری و رمز عبور لازم است.');
  if(blocked){audit(null,'LOGIN_RATE_LIMITED','auth',username,{ip:clientIp(req),blockedUntil:blocked});return fail(res,429,'RATE_LIMITED','تلاش‌های ورود بیش از حد است. چند دقیقه بعد دوباره تلاش کنید.',{blockedUntil:blocked});}
  var u=db.prepare('SELECT * FROM users WHERE username=? LIMIT 1').get(username),verified=u&&u.is_active?await security.verifyPassword(password,u.password_hash):{ok:false,needsRehash:false};
  if(!u||!u.is_active||!verified.ok){loginFailure(keys);audit(u||null,'LOGIN_FAILURE','auth',username,{ip:clientIp(req),userAgent:userAgent(req)});return fail(res,401,'INVALID_CREDENTIALS','نام کاربری یا رمز عبور نادرست است.');}
  loginSuccess(keys);cleanupSessions();
  // If this browser already has a session cookie, replace it instead of leaving
  // an unreachable old session in the database. This also makes account switching
  // after an interrupted/offline logout deterministic.
  var previousCookie=parseCookies(req)[env.sessionCookieName]||'';
  if(previousCookie){try{db.prepare('DELETE FROM sessions WHERE token_hash=?').run(security.hashToken(previousCookie));}catch(e){console.error('previous session cleanup failed:',e.message);}}
  if(verified.needsRehash){try{db.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?').run(await security.hashPassword(password),now(),u.id);}catch(e){console.error('password rehash failed:',e.message);}}
  var raw=security.newSessionToken(),csrf=security.newCsrfToken(),created=new Date(),ttlMs=u.role==='admin'?env.sessionHoursAdmin*3600000:env.sessionDaysStudent*86400000,expiry=new Date(created.getTime()+ttlMs),sessionId=security.id('session');
  db.prepare('INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at,csrf_hash,csrf_token,ip_address,user_agent) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(sessionId,u.id,security.hashToken(raw),expiry.toISOString(),created.toISOString(),created.toISOString(),security.hashToken(csrf),csrf,clientIp(req),userAgent(req));
  setSessionCookie(res,raw,Math.floor(ttlMs/1000));
  audit(u,'LOGIN_SUCCESS','user',u.id,{ip:clientIp(req),sessionId:sessionId});
  ok(res,{expiresAt:expiry.toISOString(),csrfToken:csrf,sessionId:sessionId,user:{id:u.id,username:u.username,role:u.role,displayName:u.display_name,studentId:u.student_id}});
});

router.add('POST', /^\/api\/v1\/auth\/logout$/, null, function(req,res) {
  // Logout is idempotent: always clear the browser cookie, even if the server
  // session already expired/revoked. This prevents stale HttpOnly cookies from
  // making the UI appear to log back in after an interrupted logout.
  var raw=parseCookies(req)[env.sessionCookieName]||'',row=null;
  if(raw){
    var hash=security.hashToken(raw);
    row=db.prepare('SELECT s.id AS session_id,u.id,u.username,u.role,u.display_name,u.student_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1').get(hash);
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash);
  }
  clearSessionCookie(res);
  if(row)audit(row,'LOGOUT','user',row.id,{sessionId:row.session_id});
  ok(res,{loggedOut:true});
});

router.add('GET', /^\/api\/v1\/auth\/me$/, ['admin','student'], function(req,res,match,body,user) {
  var csrf=ensureCsrf(user.session_id);
  ok(res,{id:user.id,username:user.username,role:user.role,displayName:user.display_name,studentId:user.student_id,csrfToken:csrf,sessionId:user.session_id,sessionExpiresAt:user.expires_at});
});

router.add('POST', /^\/api\/v1\/auth\/change-password$/, ['admin','student'], async function(req,res,match,body,user) {
  var current=str(body.currentPassword,300),next=str(body.newPassword,300);
  if(next.length<12)return fail(res,400,'WEAK_PASSWORD','رمز جدید باید حداقل ۱۲ نویسه باشد.');
  var row=db.prepare('SELECT * FROM users WHERE id=?').get(user.id),verified=await security.verifyPassword(current,row.password_hash);
  if(!verified.ok)return fail(res,401,'INVALID_CREDENTIALS','رمز فعلی درست نیست.');
  var hash=await security.hashPassword(next);db.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=?').run(hash,now(),user.id);
  db.prepare('DELETE FROM sessions WHERE user_id=? AND id<>?').run(user.id,user.session_id);audit(user,'PASSWORD_CHANGED','user',user.id,{});ok(res,{changed:true,otherSessionsRevoked:true});
});

router.add('GET', /^\/api\/v1\/auth\/sessions$/, ['admin','student'], function(req,res,match,body,user){
  var rows=db.prepare('SELECT id,expires_at AS expiresAt,created_at AS createdAt,last_seen_at AS lastSeenAt,ip_address AS ipAddress,user_agent AS userAgent FROM sessions WHERE user_id=? ORDER BY last_seen_at DESC').all(user.id);
  ok(res,rows.map(function(x){x.current=x.id===user.session_id;return x;}));
});
router.add('DELETE', /^\/api\/v1\/auth\/sessions\/([^/]+)$/, ['admin','student'], function(req,res,match,body,user){
  if(match[1]===user.session_id)return fail(res,400,'CURRENT_SESSION','برای خروج از نشست فعلی از دکمه خروج استفاده کنید.');
  var r=db.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').run(match[1],user.id);audit(user,'SESSION_REVOKED','session',match[1],{});ok(res,{revoked:!!r.changes});
});

router.add('GET', /^\/api\/v1\/events$/, ['admin','student'], function(req,res,match,body,user){ realtime.stream(db,req,res,user); });

router.add('GET', /^\/api\/v1\/dashboard$/, ['student'], function(req,res,match,body,user) {
  var q = query(req); var date = isoDateValid(q.date) ? q.date : new Date().toISOString().slice(0,10);
  var data = studentDashboard(user.student_id, date, false);
  if (!data) return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');
  ok(res, data);
});

router.add('GET', /^\/api\/v1\/plans$/, ['student'], function(req,res,match,body,user) {
  var q = query(req);
  if (isoDateValid(q.date)) {
    var p = db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date=? AND published=1').get(user.student_id, q.date);
    return ok(res, mapPlan(p, user.student_id));
  }
  var from = isoDateValid(q.from) ? q.from : '0000-01-01';
  var to = isoDateValid(q.to) ? q.to : '9999-12-31';
  var rows = db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date BETWEEN ? AND ? AND published=1 ORDER BY plan_date').all(user.student_id, from, to);
  ok(res, rows.map(function(p){return mapPlan(p,user.student_id);}));
});

router.add('PUT', /^\/api\/v1\/tasks\/([^/]+)\/completion$/, ['student'], function(req,res,match,body,user) {
  var taskId = match[1];
  var task = db.prepare(`SELECT t.id,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?`).get(taskId);
  if (!task || task.student_id !== user.student_id) return fail(res,404,'NOT_FOUND','فعالیت پیدا نشد.');
  var status = ['done','partial','skipped'].indexOf(body.status) >= 0 ? body.status : 'done';
  var id = security.id('completion');
  db.prepare(`INSERT INTO task_completions (id,task_id,student_id,status,actual_minutes,actual_tests,note,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(task_id,student_id) DO UPDATE SET status=excluded.status,actual_minutes=excluded.actual_minutes,actual_tests=excluded.actual_tests,note=excluded.note,updated_at=excluded.updated_at`)
    .run(id, taskId, user.student_id, status, Math.max(0, num(body.actualMinutes,0)), Math.max(0,num(body.actualTests,0)), str(body.note,1000), now());
  recordActivity(user.student_id,'task.'+status,'task',taskId,{actualMinutes:Math.max(0,num(body.actualMinutes,0)),actualTests:Math.max(0,num(body.actualTests,0))});
  ok(res, { taskId:taskId, status:status, actualMinutes:Math.max(0,num(body.actualMinutes,0)), actualTests:Math.max(0,num(body.actualTests,0)) });
});

router.add('DELETE', /^\/api\/v1\/tasks\/([^/]+)\/completion$/, ['student'], function(req,res,match,body,user) {
  db.prepare('DELETE FROM task_completions WHERE task_id=? AND student_id=?').run(match[1], user.student_id);
  ok(res,{taskId:match[1],cleared:true});
});


router.add('POST', /^\/api\/v1\/presence$/, ['student'], function(req,res,match,body,user){
  if(!bucketAllow('presence:'+user.id,4,60000))return fail(res,429,'RATE_LIMITED','به‌روزرسانی وضعیت بیش از حد است.');
  var state=['online','studying','quiz','idle'].indexOf(body.state)>=0?body.state:'online';
  var p=touchPresence(user.student_id,state,str(body.taskId,120)||null,str(body.sessionId,120)||null,str(body.deviceLabel,120));ok(res,p);
});
router.add('POST', /^\/api\/v1\/activity$/, ['student'], function(req,res,match,body,user){
  if(!bucketAllow('activity:'+user.id,40,60000))return fail(res,429,'RATE_LIMITED','رویدادهای زیادی ارسال شده است.');
  var allowed={'task.opened':1,'task.done':1,'task.partial':1,'task.skipped':1,'study.started':1,'study.finished':1,'quiz.started':1,'quiz.completed':1,'quiz.cancelled':1,'report.submitted':1,'recovery.requested':1,'issue.created':1,'review.done':1,'review.skipped':1,'exam.retry_requested':1};
  var eventType=str(body.eventType,80);if(!allowed[eventType])return fail(res,400,'EVENT_TYPE','نوع رویداد معتبر نیست.');
  var meta=body.metadata&&typeof body.metadata==='object'?body.metadata:{};if(JSON.stringify(meta).length>4096)return fail(res,413,'METADATA_TOO_LARGE','اطلاعات رویداد بیش از حد بزرگ است.');
  recordActivity(user.student_id,eventType,str(body.entityType,80),str(body.entityId,120),meta);touchPresence(user.student_id,str(body.state,30)||'online',str(body.taskId,120)||null,str(body.sessionId,120)||null,str(body.deviceLabel,120));ok(res,{recorded:true},201);
});
router.add('GET', /^\/api\/v1\/study-sessions\/active$/, ['student'], function(req,res,match,body,user){ok(res,activeStudySession(user.student_id));});
router.add('POST', /^\/api\/v1\/study-sessions\/start$/, ['student'], function(req,res,match,body,user){
  var taskId=str(body.taskId,120)||null;if(taskId){var task=db.prepare(`SELECT t.id,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?`).get(taskId);if(!task||task.student_id!==user.student_id)return fail(res,404,'NOT_FOUND','فعالیت پیدا نشد.');}
  var old=activeStudySession(user.student_id);if(old){if((old.taskId||null)===(taskId||null))return ok(res,old);return fail(res,409,'ACTIVE_STUDY_SESSION','یک جلسه مطالعه دیگر هنوز فعال است. ابتدا همان جلسه را تمام کنید.',{activeSession:old});}
  var id=security.id('study'),t=now();db.prepare(`INSERT INTO study_sessions (id,student_id,task_id,started_at,ended_at,status,actual_minutes,last_heartbeat_at,note,created_at,updated_at) VALUES (?,?,?,?,NULL,'active',0,?,?,?,?)`).run(id,user.student_id,taskId,t,t,str(body.note,500),t,t);
  touchPresence(user.student_id,'studying',taskId,id,str(body.deviceLabel,120));recordActivity(user.student_id,'study.started','task',taskId,{sessionId:id});ok(res,activeStudySession(user.student_id),201);
});
router.add('POST', /^\/api\/v1\/study-sessions\/([^/]+)\/heartbeat$/, ['student'], function(req,res,match,body,user){
  var ss=db.prepare("SELECT * FROM study_sessions WHERE id=? AND student_id=? AND status='active'").get(match[1],user.student_id);if(!ss)return fail(res,404,'NOT_FOUND','جلسه فعال پیدا نشد.');db.prepare('UPDATE study_sessions SET last_heartbeat_at=?,updated_at=? WHERE id=?').run(now(),now(),ss.id);touchPresence(user.student_id,'studying',ss.task_id,ss.id,str(body.deviceLabel,120));ok(res,{id:ss.id,alive:true});
});
router.add('POST', /^\/api\/v1\/study-sessions\/([^/]+)\/finish$/, ['student'], function(req,res,match,body,user){
  var ss=db.prepare("SELECT * FROM study_sessions WHERE id=? AND student_id=? AND status='active'").get(match[1],user.student_id);if(!ss)return fail(res,404,'NOT_FOUND','جلسه فعال پیدا نشد.');var end=now(),minutes=Math.max(0,Math.round((new Date(end)-new Date(ss.started_at))/60000));db.prepare("UPDATE study_sessions SET ended_at=?,status='finished',actual_minutes=?,last_heartbeat_at=?,note=?,updated_at=? WHERE id=?").run(end,minutes,end,str(body.note,500)||ss.note,end,ss.id);touchPresence(user.student_id,'online',null,null,str(body.deviceLabel,120));recordActivity(user.student_id,'study.finished','task',ss.task_id,{sessionId:ss.id,actualMinutes:minutes});ok(res,{id:ss.id,actualMinutes:minutes,endedAt:end});
});
router.add('POST', /^\/api\/v1\/task-issues$/, ['student'], function(req,res,match,body,user){
  var taskId=str(body.taskId,120)||null;if(taskId){var task=db.prepare(`SELECT t.id,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?`).get(taskId);if(!task||task.student_id!==user.student_id)return fail(res,404,'NOT_FOUND','فعالیت پیدا نشد.');}var id=security.id('issue'),t=now();db.prepare("INSERT INTO task_issues (id,student_id,task_id,issue_type,note,status,advisor_note,created_at,updated_at) VALUES (?,?,?,?,?,'open','',?,?)").run(id,user.student_id,taskId,str(body.issueType,100)||'other',str(body.note,1200),t,t);recordActivity(user.student_id,'issue.created','task',taskId,{issueType:str(body.issueType,100)});ok(res,{id:id,status:'open'},201);
});
router.add('GET', /^\/api\/v1\/task-issues$/, ['student'], function(req,res,match,body,user){ok(res,db.prepare(`SELECT id,task_id AS taskId,issue_type AS issueType,note,status,advisor_note AS advisorNote,created_at AS createdAt,updated_at AS updatedAt FROM task_issues WHERE student_id=? ORDER BY created_at DESC LIMIT 100`).all(user.student_id));});
router.add('GET', /^\/api\/v1\/tasks\/([^/]+)\/comments$/, ['student'], function(req,res,match,body,user){ok(res,db.prepare(`SELECT id,body,created_at AS createdAt FROM advisor_comments WHERE student_id=? AND task_id=? AND visible_to_student=1 ORDER BY created_at`).all(user.student_id,match[1]));});
router.add('GET', /^\/api\/v1\/reviews$/, ['student'], function(req,res,match,body,user){ok(res,getDueReviews(user.student_id,50));});
router.add('PATCH', /^\/api\/v1\/reviews\/([^/]+)$/, ['student'], function(req,res,match,body,user){var status=['done','skipped'].indexOf(body.status)>=0?body.status:'done';var r=db.prepare("SELECT * FROM review_items WHERE id=? AND student_id=?").get(match[1],user.student_id);if(!r)return fail(res,404,'NOT_FOUND','مرور پیدا نشد.');db.prepare('UPDATE review_items SET status=?,completed_at=? WHERE id=?').run(status,now(),r.id);recordActivity(user.student_id,'review.'+status,'syllabus',r.syllabus_id,{reviewId:r.id});ok(res,{id:r.id,status:status});});

router.add('GET', /^\/api\/v1\/subjects$/, ['student'], function(req,res,match,body,user) { ok(res, getSubjects(user.student_id)); });
router.add('GET', /^\/api\/v1\/exams$/, ['student'], function(req,res,match,body,user) { ok(res, getExams(user.student_id,false)); });

router.add('GET', /^\/api\/v1\/exams\/([^/]+)\/progress$/, ['student'], function(req,res,match,body,user) {
  var data=getExamProgress(user.student_id,match[1]);if(!data)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');ok(res,data);
});

router.add('POST', /^\/api\/v1\/exams\/([^/]+)\/start$/, ['student'], function(req,res,match,body,user){
  var e=db.prepare('SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(match[1],user.student_id);
  if(!e)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');
  var access=examAccess(e,user.student_id);
  if(!access.quiz||!access.questionCount)return fail(res,409,'EXAM_NOT_READY','سؤال‌های آزمون هنوز توسط مشاور آماده نشده است.');
  if(!access.canStart){
    var messages={not_published:'آزمون هنوز برای شما منتشر نشده است.',cancelled:'این آزمون لغو شده است.',completed:'این آزمون بسته شده است.',not_open:'زمان شروع آزمون هنوز نرسیده است.',closed:'زمان آزمون تمام شده است.',attempt_limit:'این آزمون فقط یک‌بار قابل انجام است. برای تلاش مجدد درخواست بفرستید.',retry_pending:'درخواست تلاش مجدد در انتظار بررسی مشاور است.'};
    return fail(res,409,'EXAM_UNAVAILABLE',messages[access.reason]||'آزمون در حال حاضر قابل اجرا نیست.',{reason:access.reason,openAt:access.openAt,closeAt:access.closeAt,attemptsUsed:access.attemptsUsed,allowedAttempts:access.allowedAttempts});
  }
  var run=createOrResumeQuizRun(access.quiz,user.student_id,body.deviceLabel);
  run.exam={id:e.id,title:e.title,openAt:access.openAt,closeAt:access.closeAt,attemptsUsed:access.attemptsUsed,allowedAttempts:access.allowedAttempts,retryWindow:access.retryWindow};
  ok(res,run,run.resumed?200:201);
});

router.add('POST', /^\/api\/v1\/exams\/([^/]+)\/retry-request$/, ['student'], function(req,res,match,body,user){
  var e=db.prepare('SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(match[1],user.student_id);if(!e)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');
  var access=examAccess(e,user.student_id);
  if(access.attemptsUsed<access.allowedAttempts)return fail(res,409,'RETRY_NOT_NEEDED','هنوز یک تلاش مجاز برای این آزمون دارید.');
  if(access.retryRequest)return fail(res,409,'RETRY_PENDING','یک درخواست تلاش مجدد از قبل در انتظار بررسی است.');
  var id=security.id('examretry'),t=now(),message=str(body.message,1200);
  db.prepare("INSERT INTO exam_attempt_requests (id,exam_id,student_id,message,status,advisor_note,created_at,updated_at) VALUES (?,?,?,?,'pending','',?,?)").run(id,e.id,user.student_id,message,t,t);
  recordActivity(user.student_id,'exam.retry_requested','exam',e.id,{requestId:id});emitAdmin(user.student_id,'exam.retry_requested',{studentId:user.student_id,examId:e.id,requestId:id,title:e.title,message:message});
  ok(res,{id:id,status:'pending'},201);
});

router.add('PUT', /^\/api\/v1\/syllabus\/([^/]+)\/progress$/, ['student'], function(req,res,match,body,user) {
  if(!db.prepare('SELECT id FROM exam_syllabus WHERE id=?').get(match[1]))return fail(res,404,'NOT_FOUND','بودجه آزمون پیدا نشد.');
  var status=['unread','read','tested','review','mastered'].indexOf(body.status)>=0?body.status:'read';
  var t=now();db.prepare(`INSERT INTO syllabus_progress (student_id,syllabus_id,status,accuracy,note,updated_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(student_id,syllabus_id) DO UPDATE SET status=excluded.status,accuracy=excluded.accuracy,note=excluded.note,updated_at=excluded.updated_at`)
    .run(user.student_id,match[1],status,Math.min(100,Math.max(0,num(body.accuracy,0))),str(body.note,1000),t);
  if(status==='read'||status==='tested')scheduleReviews(user.student_id,match[1],todayIso());
  recordActivity(user.student_id,'syllabus.'+status,'syllabus',match[1],{accuracy:Math.min(100,Math.max(0,num(body.accuracy,0)))});
  ok(res,{syllabusId:match[1],status:status,accuracy:Math.min(100,Math.max(0,num(body.accuracy,0)))});
});

router.add('GET', /^\/api\/v1\/mistakes$/, ['student'], function(req,res,match,body,user) {var q=query(req);ok(res,getMistakes(user.student_id,q.limit));});
router.add('PATCH', /^\/api\/v1\/mistakes\/([^/]+)$/, ['student'], function(req,res,match,body,user) {
  var a=db.prepare(`SELECT qa.id FROM quiz_answers qa JOIN quiz_attempts att ON att.id=qa.attempt_id WHERE qa.id=? AND att.student_id=?`).get(match[1],user.student_id);
  if(!a)return fail(res,404,'NOT_FOUND','اشتباه پیدا نشد.');db.prepare('UPDATE quiz_answers SET error_reason=? WHERE id=?').run(str(body.errorReason,100),a.id);ok(res,{id:a.id,errorReason:str(body.errorReason,100)});
});

router.add('POST', /^\/api\/v1\/recovery-requests$/, ['student'], function(req,res,match,body,user) {
  var date=isoDateValid(body.planDate)?body.planDate:new Date().toISOString().slice(0,10),t=now(),rid=security.id('recovery');
  db.prepare("INSERT INTO recovery_requests (id,student_id,plan_date,reason,note,status,created_at,updated_at) VALUES (?,?,?,?,?,'pending',?,?)")
    .run(rid,user.student_id,date,str(body.reason,200),str(body.note,1500),t,t);
  notifyStudent(user.student_id,'درخواست ریکاوری ثبت شد','مشاور درخواست به‌هم‌خوردن برنامه را بررسی می‌کند.');recordActivity(user.student_id,'recovery.requested','plan',date,{recoveryId:rid,reason:str(body.reason,200)});
  ok(res,{id:rid,status:'pending'},201);
});

router.add('GET', /^\/api\/v1\/notifications$/, ['student'], function(req,res,match,body,user) {
  ok(res,db.prepare('SELECT id,title,body,is_read AS isRead,created_at AS createdAt FROM notifications WHERE student_id=? ORDER BY created_at DESC LIMIT 50').all(user.student_id));
});
router.add('PUT', /^\/api\/v1\/notifications\/([^/]+)\/read$/, ['student'], function(req,res,match,body,user) {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND student_id=?').run(match[1],user.student_id);ok(res,{id:match[1],isRead:true});
});
router.add('PUT', /^\/api\/v1\/notifications\/read-all$/, ['student'], function(req,res,match,body,user) {
  var r=db.prepare('UPDATE notifications SET is_read=1 WHERE student_id=? AND is_read=0').run(user.student_id);ok(res,{updated:r.changes});
});

router.add('POST', /^\/api\/v1\/reports$/, ['student'], function(req,res,match,body,user) {
  var date=str(body.planDate,10);if(!isoDateValid(date))return fail(res,400,'VALIDATION','تاریخ گزارش معتبر نیست.');
  var t=now(),m=objectiveDailyMetrics(user.student_id,date),focus=Math.min(10,Math.max(0,num(body.focus,0))),fatigue=Math.min(10,Math.max(0,num(body.fatigue,0))),motivation=Math.min(10,Math.max(0,num(body.motivation,0)));
  db.prepare(`INSERT INTO daily_reports (id,student_id,plan_date,study_hours,tests,correct,wrong,blank,focus,fatigue,motivation,problem,tomorrow,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(student_id,plan_date) DO UPDATE SET study_hours=excluded.study_hours,tests=excluded.tests,correct=excluded.correct,wrong=excluded.wrong,blank=excluded.blank,focus=excluded.focus,fatigue=excluded.fatigue,motivation=excluded.motivation,problem=excluded.problem,tomorrow=excluded.tomorrow,updated_at=excluded.updated_at`)
    .run(security.id('report'),user.student_id,date,m.studyHours,m.tests,m.correct,m.wrong,m.blank,focus,fatigue,motivation,str(body.problem,2000),str(body.tomorrow,2000),t,t);
  recordActivity(user.student_id,'report.submitted','report',date,{studyMinutes:m.studyMinutes,tests:m.tests,focus:focus,fatigue:fatigue,motivation:motivation});
  ok(res,Object.assign({},getReport(user.student_id,date),{serverMetrics:m}),201);
});

router.add('GET', /^\/api\/v1\/reports$/, ['student'], function(req,res,match,body,user) {
  var q=query(req); var from=isoDateValid(q.from)?q.from:'0000-01-01'; var to=isoDateValid(q.to)?q.to:'9999-12-31';
  ok(res, db.prepare('SELECT * FROM daily_reports WHERE student_id=? AND plan_date BETWEEN ? AND ? ORDER BY plan_date DESC').all(user.student_id,from,to));
});

router.add('POST', /^\/api\/v1\/quizzes\/([^/]+)\/start$/, ['student'], function(req,res,match,body,user){
  var qz=db.prepare('SELECT * FROM quizzes WHERE id=? AND active=1').get(match[1]);if(!qz)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');
  if(qz.exam_id){
    var e=db.prepare('SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(qz.exam_id,user.student_id);if(!e)return fail(res,404,'NOT_FOUND','آزمون اصلی پیدا نشد.');
    var access=examAccess(e,user.student_id);if(!access.canStart)return fail(res,409,'EXAM_UNAVAILABLE','این آزمون در حال حاضر قابل اجرا نیست.',{reason:access.reason});
  }
  var run=createOrResumeQuizRun(qz,user.student_id,body.deviceLabel);ok(res,run,run.resumed?200:201);
});

router.add('GET', /^\/api\/v1\/quizzes\/(?!history$)([^/]+)$/, ['student'], function(req,res,match) {
  var qz = db.prepare('SELECT id,title,subject,duration_minutes AS durationMinutes,exam_id AS examId FROM quizzes WHERE id=? AND active=1').get(match[1]);
  if (!qz) return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');
  qz.questions = db.prepare('SELECT id,question_text AS question,option_a,option_b,option_c,option_d,sort_order FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order').all(qz.id).map(function(q){ return {id:q.id,question:q.question,options:[q.option_a,q.option_b,q.option_c,q.option_d]}; });
  ok(res,qz);
});

router.add('POST', /^\/api\/v1\/quizzes\/([^/]+)\/attempts$/, ['student'], function(req,res,match,body,user) {
  var qz = db.prepare('SELECT * FROM quizzes WHERE id=? AND active=1').get(match[1]);
  if (!qz) return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');
  var questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order').all(qz.id);
  var incoming = Array.isArray(body.answers) ? body.answers : [];
  var map = {};
  incoming.forEach(function(a){ map[a.questionId] = a; });
  var runId=str(body.runId,120),run=db.prepare("SELECT * FROM quiz_runs WHERE id=? AND quiz_id=? AND student_id=? AND status='active'").get(runId,qz.id,user.student_id);if(!run)return fail(res,409,'QUIZ_RUN','جلسه آزمون معتبر نیست؛ آزمون را دوباره شروع کنید.');
  var correct=0,wrong=0,blank=0; var attemptId=security.id('attempt'); var t=now(),duration=Math.max(0,Math.round((new Date(t)-new Date(run.started_at))/1000));
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO quiz_attempts (id,quiz_id,student_id,started_at,submitted_at,correct,wrong,blank,percent,duration_seconds) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(attemptId,qz.id,user.student_id,run.started_at,t,0,0,0,0,duration);
    var insert = db.prepare('INSERT INTO quiz_answers (id,attempt_id,question_id,selected_option,is_correct,error_reason) VALUES (?,?,?,?,?,?)');
    questions.forEach(function(q) {
      var a = map[q.id] || {}; var selected = ['a','b','c','d'].indexOf(a.selectedOption)>=0?a.selectedOption:null;
      var isCorrect = selected && selected===q.correct_option ? 1 : 0;
      if (!selected) blank++; else if (isCorrect) correct++; else wrong++;
      insert.run(security.id('answer'),attemptId,q.id,selected,isCorrect,str(a.errorReason,100));
    });
    var total=questions.length; var percent= total ? Math.round(correct*100/total) : 0;
    db.prepare('UPDATE quiz_attempts SET correct=?,wrong=?,blank=?,percent=? WHERE id=?').run(correct,wrong,blank,percent,attemptId);db.prepare("UPDATE quiz_runs SET status='submitted',submitted_at=? WHERE id=?").run(t,run.id);
    if(qz.exam_id){
      var linkedTasks=db.prepare(`SELECT t.id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.exam_id=? AND p.student_id=?`).all(qz.exam_id,user.student_id);
      linkedTasks.forEach(function(lt){db.prepare(`INSERT INTO task_completions (id,task_id,student_id,status,actual_minutes,actual_tests,note,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(task_id,student_id) DO UPDATE SET status='done',actual_minutes=excluded.actual_minutes,actual_tests=excluded.actual_tests,note=excluded.note,updated_at=excluded.updated_at`).run(security.id('completion'),lt.id,user.student_id,'done',Math.max(1,Math.round(duration/60)),questions.length,'آزمون در Moshaver ثبت شد.',t);});
    }
    db.exec('COMMIT');
    var review = db.prepare(`SELECT qa.id AS answerId,qa.question_id AS questionId,qq.question_text AS question,qa.selected_option AS selectedOption,qq.correct_option AS correctOption,qq.explanation,qa.is_correct AS isCorrect,qa.error_reason AS errorReason
      FROM quiz_answers qa JOIN quiz_questions qq ON qq.id=qa.question_id WHERE qa.attempt_id=? ORDER BY qq.sort_order`).all(attemptId);
    touchPresence(user.student_id,'online',null,null,'');recordActivity(user.student_id,'quiz.completed','quiz',qz.id,{attemptId:attemptId,percent:percent,correct:correct,wrong:wrong,blank:blank,durationSeconds:duration});ok(res,{attemptId:attemptId,correct:correct,wrong:wrong,blank:blank,percent:percent,total:total,durationSeconds:duration,review:review},201);
  } catch(e) { db.exec('ROLLBACK'); throw e; }
});

router.add('GET', /^\/api\/v1\/quizzes\/history$/, ['student'], function(req,res,match,body,user) {
  ok(res, db.prepare(`SELECT qa.id,qa.quiz_id AS quizId,q.title,qa.correct,qa.wrong,qa.blank,qa.percent,qa.submitted_at AS submittedAt
    FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE qa.student_id=? ORDER BY qa.submitted_at DESC LIMIT 50`).all(user.student_id));
});

// ADMIN
// Realtime advisor chat. Sending is regular REST; receiving is delivered over the shared SSE stream.
router.add('GET', /^\/api\/v1\/chat\/conversation$/, ['student'], function(req,res,match,body,user){
  var c=getOrCreateConversation(user.student_id),admin=db.prepare("SELECT id,display_name FROM users WHERE role='admin' AND is_active=1 ORDER BY created_at LIMIT 1").get();
  ok(res,{id:c.id,studentId:c.student_id,advisor:admin?{id:admin.id,name:admin.display_name}:{id:null,name:'مشاور'},unread:conversationUnread(c.id,user)});
});
router.add('GET', /^\/api\/v1\/chat\/conversations\/([^/]+)\/messages$/, ['admin','student'], function(req,res,match,body,user){
  var c=canUseConversation(user,match[1]);if(!c)return fail(res,404,'NOT_FOUND','گفت‌وگو پیدا نشد.');
  var qy=query(req),rows=chatMessages(c.id,qy.limit),other=user.role==='admin'?db.prepare("SELECT id FROM users WHERE role='student' AND student_id=? AND is_active=1 ORDER BY created_at LIMIT 1").get(c.student_id):db.prepare("SELECT id FROM users WHERE role='admin' AND is_active=1 ORDER BY created_at LIMIT 1").get();
  var otherRead=other?getReadAt(c.id,other.id):null;
  ok(res,{conversationId:c.id,messages:rows.map(function(r){return mapChatMessage(r,otherRead,user.id);}),unread:conversationUnread(c.id,user),otherReadAt:otherRead});
});
router.add('POST', /^\/api\/v1\/chat\/conversations\/([^/]+)\/messages$/, ['admin','student'], function(req,res,match,body,user){
  var c=canUseConversation(user,match[1]);if(!c)return fail(res,404,'NOT_FOUND','گفت‌وگو پیدا نشد.');
  if(!bucketAllow('chat:'+user.id,30,60000))return fail(res,429,'RATE_LIMITED','تعداد پیام‌های ارسالی زیاد است. کمی صبر کنید.');
  var text=str(body.text,3000),reply=str(body.replyToId,120)||null;if(!text)return fail(res,400,'VALIDATION','متن پیام لازم است.');
  if(reply&&!db.prepare('SELECT 1 FROM chat_messages WHERE id=? AND conversation_id=?').get(reply,c.id))return fail(res,400,'VALIDATION','پیام مرجع معتبر نیست.');
  var id=security.id('msg'),t=now();db.prepare('INSERT INTO chat_messages (id,conversation_id,sender_user_id,sender_role,message_text,reply_to_id,created_at,edited_at,deleted_at) VALUES (?,?,?,?,?,?,?,NULL,NULL)').run(id,c.id,user.id,user.role,text,reply,t);db.prepare('UPDATE chat_conversations SET updated_at=?,last_message_at=? WHERE id=?').run(t,t,c.id);
  var item={id:id,conversationId:c.id,senderUserId:user.id,senderRole:user.role,senderName:user.display_name,text:text,replyToId:reply,createdAt:t,seen:false,studentId:c.student_id};
  if(user.role==='admin'){emitStudent(c.student_id,'chat.message.created',item);notifyStudent(c.student_id,'پیام جدید از مشاور',text.slice(0,180));}else emitAdmin(c.student_id,'chat.message.created',item);
  audit(user,'CHAT_MESSAGE_SENT','chat_message',id,{conversationId:c.id,studentId:c.student_id});ok(res,item,201);
});
router.add('POST', /^\/api\/v1\/chat\/conversations\/([^/]+)\/read$/, ['admin','student'], function(req,res,match,body,user){
  var c=canUseConversation(user,match[1]);if(!c)return fail(res,404,'NOT_FOUND','گفت‌وگو پیدا نشد.');var readAt=markConversationRead(c.id,user),payload={conversationId:c.id,studentId:c.student_id,readerRole:user.role,readAt:readAt};if(user.role==='admin')emitStudent(c.student_id,'chat.messages.read',payload);else emitAdmin(c.student_id,'chat.messages.read',payload);ok(res,payload);
});
router.add('GET', /^\/api\/v1\/admin\/chat\/conversations$/, ['admin'], function(req,res,match,body,user){ok(res,adminChatList(user));});

router.add('GET', /^\/api\/v1\/admin\/dashboard$/, ['admin'], function(req,res,match,body,user) {
  var students = db.prepare('SELECT COUNT(*) AS n FROM students WHERE active=1').get().n;
  var today = new Date().toISOString().slice(0,10);
  var plans = db.prepare('SELECT COUNT(*) AS n FROM plans WHERE plan_date=? AND published=1').get(today).n;
  var reports = db.prepare('SELECT COUNT(*) AS n FROM daily_reports WHERE plan_date=?').get(today).n;
  var upcoming = db.prepare('SELECT COUNT(*) AS n FROM exams WHERE iso_date>=?').get(today).n;
  var recoveries=db.prepare("SELECT COUNT(*) AS n FROM recovery_requests WHERE status='pending'").get().n;
  var recent = db.prepare(`SELECT dr.*,s.name AS student_name FROM daily_reports dr JOIN students s ON s.id=dr.student_id ORDER BY dr.updated_at DESC LIMIT 8`).all();
  var unreadChat=db.prepare(`SELECT COUNT(*) AS n FROM chat_messages cm LEFT JOIN chat_reads cr ON cr.conversation_id=cm.conversation_id AND cr.user_id=? WHERE cm.sender_role='student' AND cm.deleted_at IS NULL AND cm.created_at>COALESCE(cr.last_read_at,'0000-01-01T00:00:00.000Z')`).get(user.id).n;
  var missed=db.prepare(`SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id
    WHERE p.plan_date=? AND p.published=1 AND tc.id IS NULL AND t.end_time<?`).get(today,new Date().toTimeString().slice(0,5)).n;
  ok(res,{students:students,todayPlans:plans,todayReports:reports,upcomingExams:upcoming,pendingRecoveries:recoveries,missedTasks:missed,unreadChat:unreadChat,recentReports:recent});
});

router.add('GET', /^\/api\/v1\/admin\/recovery-requests$/, ['admin'], function(req,res) {
  ok(res,db.prepare(`SELECT rr.*,s.name AS student_name FROM recovery_requests rr JOIN students s ON s.id=rr.student_id ORDER BY CASE rr.status WHEN 'pending' THEN 0 ELSE 1 END,rr.created_at DESC LIMIT 100`).all());
});
router.add('PATCH', /^\/api\/v1\/admin\/recovery-requests\/([^/]+)$/, ['admin'], function(req,res,match,body,user) {
  var rr=db.prepare('SELECT * FROM recovery_requests WHERE id=?').get(match[1]);if(!rr)return fail(res,404,'NOT_FOUND','درخواست پیدا نشد.');
  var status=['pending','resolved','dismissed'].indexOf(body.status)>=0?body.status:'resolved';db.prepare('UPDATE recovery_requests SET status=?,updated_at=? WHERE id=?').run(status,now(),rr.id);
  if(status==='resolved')db.prepare('INSERT INTO notifications (id,student_id,title,body,is_read,created_at) VALUES (?,?,?,?,0,?)').run(security.id('notification'),rr.student_id,'برنامه ریکاوری بررسی شد',str(body.message,1000)||'مشاور درخواستت را بررسی کرد؛ برنامه جدید را ببین.',now());
  audit(user,'update','recovery_request',rr.id,{status:status});ok(res,{id:rr.id,status:status});
});

router.add('GET', /^\/api\/v1\/admin\/students\/([^/]+)\/overview$/, ['admin'], function(req,res,match) {
  var sid=match[1],student=db.prepare('SELECT * FROM students WHERE id=?').get(sid);if(!student)return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');
  var today=new Date().toISOString().slice(0,10),p=db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date=?').get(sid,today),next=db.prepare('SELECT id FROM exams WHERE (student_id=? OR student_id IS NULL) AND iso_date>=? AND published=1 ORDER BY iso_date LIMIT 1').get(sid,today);
  ok(res,{student:student,subjects:getSubjects(sid),todayPlan:mapPlan(p,sid),todayMetrics:getPlanMetrics(mapPlan(p,sid)),nextExam:next?getExamProgress(sid,next.id):null,recentReports:db.prepare('SELECT * FROM daily_reports WHERE student_id=? ORDER BY plan_date DESC LIMIT 7').all(sid),mistakeCount:db.prepare(`SELECT COUNT(*) AS n FROM quiz_answers qa JOIN quiz_attempts att ON att.id=qa.attempt_id WHERE att.student_id=? AND qa.is_correct=0`).get(sid).n});
});

router.add('GET', /^\/api\/v1\/admin\/students$/, ['admin'], function(req,res) {
  ok(res, db.prepare(`SELECT s.*,u.username FROM students s LEFT JOIN users u ON u.student_id=s.id AND u.role='student' ORDER BY s.created_at`).all());
});

router.add('POST', /^\/api\/v1\/admin\/students$/, ['admin'], function(req,res,match,body,user) {
  var name=str(body.name,120), username=str(body.username,100), password=str(body.password,300);
  if (!name||!username||!password) return fail(res,400,'VALIDATION','نام، نام کاربری و رمز عبور لازم است.');
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) return fail(res,409,'DUPLICATE','نام کاربری قبلاً استفاده شده است.');
  var sid=security.id('student'), uid=security.id('user'), t=now();
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO students (id,name,grade,major,target_major,target_city,rank_goal,daily_capacity,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)')
      .run(sid,name,str(body.grade,100)||'دوازدهم انسانی',str(body.major,100)||'انسانی',str(body.targetMajor,120),str(body.targetCity,120),str(body.rankGoal,120),str(body.dailyCapacity,120),t,t);
    db.prepare('INSERT INTO users (id,username,password_hash,role,display_name,student_id,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)')
      .run(uid,username,security.hashPasswordSync(password),'student',name,sid,t,t);
    var subjects=db.prepare('SELECT id FROM subjects').all(); var ins=db.prepare('INSERT OR IGNORE INTO student_subjects (student_id,subject_id,status,progress,mastery,note) VALUES (?,?,?,?,?,?)');
    subjects.forEach(function(s){ins.run(sid,s.id,'yellow',0,'','');});
    db.exec('COMMIT');
    audit(user,'create','student',sid,{name:name,username:username});
    ok(res,{id:sid,name:name,username:username},201);
  } catch(e){db.exec('ROLLBACK');throw e;}
});

router.add('PATCH', /^\/api\/v1\/admin\/students\/([^/]+)$/, ['admin'], function(req,res,match,body,user) {
  var sid=match[1], existing=db.prepare('SELECT * FROM students WHERE id=?').get(sid); if(!existing)return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');
  var fields=['name','grade','major','target_major','target_city','rank_goal','daily_capacity','active'];
  var map={name:'name',grade:'grade',major:'major',targetMajor:'target_major',targetCity:'target_city',rankGoal:'rank_goal',dailyCapacity:'daily_capacity',active:'active'};
  Object.keys(map).forEach(function(k){ if(Object.prototype.hasOwnProperty.call(body,k)){ var col=map[k], val=col==='active'?boolInt(body[k]):str(body[k],200); db.prepare('UPDATE students SET '+col+'=?,updated_at=? WHERE id=?').run(val,now(),sid); }});
  if (body.name) db.prepare(`UPDATE users SET display_name=?,updated_at=? WHERE student_id=? AND role='student'`).run(str(body.name,120),now(),sid);
  audit(user,'update','student',sid,body);
  ok(res,db.prepare('SELECT * FROM students WHERE id=?').get(sid));
});

router.add('POST', /^\/api\/v1\/admin\/students\/([^/]+)\/reset-password$/, ['admin'], function(req,res,match,body,user) {
  var password=str(body.password,300); if(password.length<8)return fail(res,400,'VALIDATION','رمز عبور باید حداقل ۸ کاراکتر باشد.');
  var r=db.prepare(`UPDATE users SET password_hash=?,updated_at=? WHERE student_id=? AND role='student'`).run(security.hashPasswordSync(password),now(),match[1]);
  if(!r.changes)return fail(res,404,'NOT_FOUND','حساب دانش‌آموز پیدا نشد.');
  db.prepare(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=? AND role='student')`).run(match[1]);
  audit(user,'reset_password','student',match[1],{}); ok(res,{reset:true});
});

router.add('GET', /^\/api\/v1\/admin\/plans$/, ['admin'], function(req,res) {
  var q=query(req), sid=str(q.studentId,100), date=str(q.date,10);
  if(!sid)return fail(res,400,'VALIDATION','studentId لازم است.');
  if(isoDateValid(date)){ var p=db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date=?').get(sid,date); return ok(res,mapPlan(p,sid)); }
  var from=isoDateValid(q.from)?q.from:'0000-01-01',to=isoDateValid(q.to)?q.to:'9999-12-31';
  var rows=db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date BETWEEN ? AND ? ORDER BY plan_date').all(sid,from,to); ok(res,rows.map(function(p){return mapPlan(p,sid);}));
});

router.add('POST', /^\/api\/v1\/admin\/plans$/, ['admin'], function(req,res,match,body,user) {
  var sid=str(body.studentId,100), date=str(body.planDate,10); if(!sid||!isoDateValid(date))return fail(res,400,'VALIDATION','دانش‌آموز و تاریخ معتبر لازم است.');
  if(!db.prepare('SELECT id FROM students WHERE id=?').get(sid))return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');
  var existing=db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date=?').get(sid,date), pid=existing?existing.id:security.id('plan'), t=now();
  if(existing){ db.prepare('UPDATE plans SET jalali_id=?,day_label=?,persian_date=?,title=?,motivation_text=?,published=?,updated_at=? WHERE id=?').run(str(body.jalaliId,30),str(body.dayLabel,50),str(body.persianDate,80),str(body.title,300),str(body.motivationText,600),boolInt(body.published),t,pid); }
  else { db.prepare('INSERT INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(pid,sid,date,str(body.jalaliId,30),str(body.dayLabel,50),str(body.persianDate,80),str(body.title,300),str(body.motivationText,600),boolInt(body.published),t,t); }
  if(existing)emitStudent(sid,'plan.updated',{planId:pid,planDate:date});else if(boolInt(body.published))emitStudent(sid,'plan.published',{planId:pid,planDate:date});
  audit(user,existing?'update':'create','plan',pid,body); ok(res,mapPlan(db.prepare('SELECT * FROM plans WHERE id=?').get(pid),sid),existing?200:201);
});

router.add('PATCH', /^\/api\/v1\/admin\/plans\/([^/]+)$/, ['admin'], function(req,res,match,body,user) {
  var p=db.prepare('SELECT * FROM plans WHERE id=?').get(match[1]);if(!p)return fail(res,404,'NOT_FOUND','برنامه پیدا نشد.');
  var map={title:'title',dayLabel:'day_label',persianDate:'persian_date',jalaliId:'jalali_id',motivationText:'motivation_text',published:'published'};
  Object.keys(map).forEach(function(k){if(Object.prototype.hasOwnProperty.call(body,k)){var col=map[k],val=col==='published'?boolInt(body[k]):str(body[k],k==='motivationText'?600:300);db.prepare('UPDATE plans SET '+col+'=?,updated_at=? WHERE id=?').run(val,now(),p.id);}});
  if(Object.prototype.hasOwnProperty.call(body,'published') && boolInt(body.published)){notifyStudent(p.student_id,'برنامه به‌روزرسانی شد','برنامه '+p.plan_date+' توسط مشاور منتشر شد.');emitStudent(p.student_id,'plan.published',{planId:p.id,planDate:p.plan_date});}else{emitStudent(p.student_id,'plan.updated',{planId:p.id,planDate:p.plan_date});}
  audit(user,'update','plan',p.id,body);ok(res,mapPlan(db.prepare('SELECT * FROM plans WHERE id=?').get(p.id),p.student_id));
});

router.add('DELETE', /^\/api\/v1\/admin\/plans\/([^/]+)$/, ['admin'], function(req,res,match,body,user) {
  var p=db.prepare('SELECT * FROM plans WHERE id=?').get(match[1]);if(!p)return fail(res,404,'NOT_FOUND','برنامه پیدا نشد.');db.prepare('DELETE FROM plans WHERE id=?').run(p.id);audit(user,'delete','plan',p.id,{});ok(res,{deleted:true});
});

router.add('POST', /^\/api\/v1\/admin\/plans\/([^/]+)\/duplicate$/, ['admin'], function(req,res,match,body,user) {
  var source=db.prepare('SELECT * FROM plans WHERE id=?').get(match[1]);if(!source)return fail(res,404,'NOT_FOUND','برنامه مبدا پیدا نشد.');
  var date=str(body.planDate,10);if(!isoDateValid(date))return fail(res,400,'VALIDATION','تاریخ مقصد معتبر نیست.');
  if(db.prepare('SELECT id FROM plans WHERE student_id=? AND plan_date=?').get(source.student_id,date))return fail(res,409,'DUPLICATE','برای تاریخ مقصد از قبل برنامه وجود دارد.');
  var pid=security.id('plan'),t=now();db.exec('BEGIN');try{
    db.prepare('INSERT INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)').run(pid,source.student_id,date,str(body.jalaliId,30),str(body.dayLabel,50),str(body.persianDate,80),str(body.title,300)||source.title,str(body.motivationText,600)||source.motivation_text||'',t,t);
    var tasks=db.prepare('SELECT * FROM tasks WHERE plan_id=? ORDER BY sort_order,start_time').all(source.id),ins=db.prepare('INSERT INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    tasks.forEach(function(x){ins.run(security.id('task'),pid,x.start_time,x.end_time,x.type,x.subject,x.title,x.pages,x.test_count,x.note,x.quiz_id,x.exam_id,x.sort_order,t,t);});db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}audit(user,'duplicate','plan',pid,{sourceId:source.id,date:date});ok(res,mapPlan(db.prepare('SELECT * FROM plans WHERE id=?').get(pid),source.student_id),201);
});

router.add('POST', /^\/api\/v1\/admin\/plans\/([^/]+)\/tasks$/, ['admin'], function(req,res,match,body,user) {
  var p=db.prepare('SELECT * FROM plans WHERE id=?').get(match[1]);if(!p)return fail(res,404,'NOT_FOUND','برنامه پیدا نشد.');
  if(!timeValid(body.start)||!timeValid(body.end))return fail(res,400,'VALIDATION','زمان شروع و پایان معتبر لازم است.');
  var id=security.id('task'),t=now(),order=num(body.sortOrder,999);
  var linkedExamId=str(body.examId,120)||null;if(linkedExamId&&!db.prepare('SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(linkedExamId,p.student_id))return fail(res,400,'VALIDATION','آزمون مرتبط معتبر نیست.');
  db.prepare('INSERT INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id,p.id,body.start,body.end,str(body.type,50)||'study',str(body.subject,150),str(body.title,300),str(body.pages,300),Math.max(0,num(body.testCount,0)),str(body.note,1000),str(body.quizId,100)||null,linkedExamId,order,t,t);
  audit(user,'create','task',id,body);ok(res,mapPlan(p,p.student_id),201);
});

router.add('PATCH', /^\/api\/v1\/admin\/tasks\/([^/]+)$/, ['admin'], function(req,res,match,body,user) {
  var task=db.prepare(`SELECT t.*,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?`).get(match[1]);if(!task)return fail(res,404,'NOT_FOUND','فعالیت پیدا نشد.');
  if(Object.prototype.hasOwnProperty.call(body,'examId')&&body.examId){var exid=str(body.examId,120);if(!db.prepare('SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)').get(exid,task.student_id))return fail(res,400,'VALIDATION','آزمون مرتبط معتبر نیست.');}
  var map={start:'start_time',end:'end_time',type:'type',subject:'subject',title:'title',pages:'pages',testCount:'test_count',note:'note',quizId:'quiz_id',examId:'exam_id',sortOrder:'sort_order'};
  Object.keys(map).forEach(function(k){if(Object.prototype.hasOwnProperty.call(body,k)){var col=map[k],val=(col==='test_count'||col==='sort_order')?Math.max(0,num(body[k],0)):str(body[k],1000); if((col==='start_time'||col==='end_time')&&!timeValid(val))return; db.prepare('UPDATE tasks SET '+col+'=?,updated_at=? WHERE id=?').run(val||null,now(),task.id);}});
  audit(user,'update','task',task.id,body);var p=db.prepare('SELECT * FROM plans WHERE id=?').get(task.plan_id);ok(res,mapPlan(p,task.student_id));
});

router.add('DELETE', /^\/api\/v1\/admin\/tasks\/([^/]+)$/, ['admin'], function(req,res,match,body,user) {var r=db.prepare('DELETE FROM tasks WHERE id=?').run(match[1]);if(!r.changes)return fail(res,404,'NOT_FOUND','فعالیت پیدا نشد.');audit(user,'delete','task',match[1],{});ok(res,{deleted:true});});

router.add('GET', /^\/api\/v1\/admin\/subjects$/, ['admin'], function(req,res) {ok(res,db.prepare('SELECT * FROM subjects ORDER BY display_order').all());});
router.add('POST', /^\/api\/v1\/admin\/subjects$/, ['admin'], function(req,res,match,body,user){var name=str(body.name,150),key=str(body.subjectKey,80);if(!name||!key)return fail(res,400,'VALIDATION','نام و کلید درس لازم است.');var id=security.id('subject'),t=now();try{db.prepare('INSERT INTO subjects (id,subject_key,name,display_order,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(id,key,name,num(body.displayOrder,99),t,t);}catch(e){return fail(res,409,'DUPLICATE','کلید درس تکراری است.');}db.prepare('INSERT OR IGNORE INTO student_subjects (student_id,subject_id,status,progress,mastery,note) SELECT id,?,\'yellow\',0,\'\',\'\' FROM students').run(id);audit(user,'create','subject',id,body);ok(res,{id:id,name:name,subjectKey:key},201);});
router.add('PATCH', /^\/api\/v1\/admin\/subjects\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var s=db.prepare('SELECT * FROM subjects WHERE id=?').get(match[1]);if(!s)return fail(res,404,'NOT_FOUND','درس پیدا نشد.');if(body.name)db.prepare('UPDATE subjects SET name=?,updated_at=? WHERE id=?').run(str(body.name,150),now(),s.id);if(Object.prototype.hasOwnProperty.call(body,'displayOrder'))db.prepare('UPDATE subjects SET display_order=?,updated_at=? WHERE id=?').run(num(body.displayOrder,0),now(),s.id);audit(user,'update','subject',s.id,body);ok(res,db.prepare('SELECT * FROM subjects WHERE id=?').get(s.id));});

router.add('GET', /^\/api\/v1\/admin\/student-subjects\/([^/]+)$/, ['admin'], function(req,res,match){ok(res,getSubjects(match[1]));});
router.add('PATCH', /^\/api\/v1\/admin\/student-subjects\/([^/]+)\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var sid=match[1],subid=match[2];if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(sid)||!db.prepare('SELECT 1 FROM subjects WHERE id=?').get(subid))return fail(res,404,'NOT_FOUND','دانش‌آموز یا درس پیدا نشد.');db.prepare(`INSERT INTO student_subjects (student_id,subject_id,status,progress,mastery,note) VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,subject_id) DO UPDATE SET status=excluded.status,progress=excluded.progress,mastery=excluded.mastery,note=excluded.note`).run(sid,subid,str(body.status,20)||'yellow',Math.min(100,Math.max(0,num(body.progress,0))),str(body.mastery,100),str(body.note,1000));audit(user,'update','student_subject',sid+':'+subid,body);ok(res,getSubjects(sid));});

router.add('GET', /^\/api\/v1\/admin\/exams$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120);ok(res,getExams(sid,true));});
router.add('POST', /^\/api\/v1\/admin\/exams$/, ['admin'], function(req,res,match,body,user){var title=str(body.title,200),iso=str(body.isoDate,10),pd=str(body.persianDate,100),sid=str(body.studentId,120);if(!title||!isoDateValid(iso)||!pd||!sid)return fail(res,400,'VALIDATION','دانش‌آموز، عنوان، تاریخ شمسی و تاریخ ISO لازم است.');if(!db.prepare('SELECT id FROM students WHERE id=?').get(sid))return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');var openAt=str(body.openAt,80)||iso+'T08:00:00+03:30',closeAt=str(body.closeAt,80)||iso+'T13:00:00+03:30';if(!dateTimeValid(openAt)||!dateTimeValid(closeAt)||new Date(closeAt)<=new Date(openAt))return fail(res,400,'VALIDATION','بازه زمانی آزمون معتبر نیست.');var id=security.id('exam'),t=now();db.prepare('INSERT INTO exams (id,title,persian_date,iso_date,note,status,created_at,updated_at,student_id,open_at,close_at,duration_minutes,max_attempts,instructions,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,title,pd,iso,str(body.note,1000),str(body.status,30)||'upcoming',t,t,sid,openAt,closeAt,Math.max(1,num(body.durationMinutes,120)),1,str(body.instructions,3000),body.published===false?0:1);var quizId=security.id('quiz'),qt=now();db.prepare('INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)').run(quizId,title,'آزمون اصلی',Math.max(1,num(body.durationMinutes,120)),id,qt,qt);audit(user,'create','exam',id,body);ok(res,mapExam(db.prepare('SELECT * FROM exams WHERE id=?').get(id),sid,true),201);});
router.add('PATCH', /^\/api\/v1\/admin\/exams\/([^/]+)$/, ['admin'], function(req,res,match,body,user){
  var e=db.prepare('SELECT * FROM exams WHERE id=?').get(match[1]);if(!e)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');
  var title=Object.prototype.hasOwnProperty.call(body,'title')?str(body.title,200):e.title;
  var pd=Object.prototype.hasOwnProperty.call(body,'persianDate')?str(body.persianDate,100):e.persian_date;
  var iso=Object.prototype.hasOwnProperty.call(body,'isoDate')?str(body.isoDate,10):e.iso_date;
  var sid=Object.prototype.hasOwnProperty.call(body,'studentId')?str(body.studentId,120):(e.student_id||'');
  var openAt=Object.prototype.hasOwnProperty.call(body,'openAt')?str(body.openAt,80):examDefaultOpen(e);
  var closeAt=Object.prototype.hasOwnProperty.call(body,'closeAt')?str(body.closeAt,80):examDefaultClose(e);
  if(!title||!pd||!isoDateValid(iso)||!sid)return fail(res,400,'VALIDATION','دانش‌آموز، عنوان، تاریخ شمسی و تاریخ ISO لازم است.');
  if(!db.prepare('SELECT id FROM students WHERE id=?').get(sid))return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');
  if(!dateTimeValid(openAt)||!dateTimeValid(closeAt)||new Date(closeAt)<=new Date(openAt))return fail(res,400,'VALIDATION','بازه زمانی آزمون معتبر نیست.');
  var duration=Object.prototype.hasOwnProperty.call(body,'durationMinutes')?Math.max(1,num(body.durationMinutes,120)):Math.max(1,Number(e.duration_minutes||120));
  var published=Object.prototype.hasOwnProperty.call(body,'published')?boolInt(body.published):Number(e.published==null?1:e.published);
  var note=Object.prototype.hasOwnProperty.call(body,'note')?str(body.note,1000):(e.note||'');
  var status=Object.prototype.hasOwnProperty.call(body,'status')?str(body.status,30):(e.status||'upcoming');
  var instructions=Object.prototype.hasOwnProperty.call(body,'instructions')?str(body.instructions,3000):(e.instructions||'');
  var t=now();
  db.prepare('UPDATE exams SET title=?,persian_date=?,iso_date=?,note=?,status=?,student_id=?,open_at=?,close_at=?,duration_minutes=?,max_attempts=1,instructions=?,published=?,updated_at=? WHERE id=?')
    .run(title,pd,iso,note,status,sid,openAt,closeAt,duration,instructions,published,t,e.id);
  var qz=examQuiz(e.id);if(qz)db.prepare('UPDATE quizzes SET title=?,duration_minutes=?,updated_at=? WHERE id=?').run(title,duration,t,qz.id);
  audit(user,'update','exam',e.id,body);var fresh=db.prepare('SELECT * FROM exams WHERE id=?').get(e.id);ok(res,mapExam(fresh,sid,true));
});
router.add('DELETE', /^\/api\/v1\/admin\/exams\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var r=db.prepare('DELETE FROM exams WHERE id=?').run(match[1]);if(!r.changes)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');audit(user,'delete','exam',match[1],{});ok(res,{deleted:true});});
router.add('POST', /^\/api\/v1\/admin\/exams\/([^/]+)\/syllabus$/, ['admin'], function(req,res,match,body,user){if(!db.prepare('SELECT id FROM exams WHERE id=?').get(match[1]))return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');var subject=str(body.subject,150),desc=str(body.description,1000);if(!subject||!desc)return fail(res,400,'VALIDATION','درس و توضیح بودجه لازم است.');var id=security.id('syllabus');db.prepare('INSERT INTO exam_syllabus (id,exam_id,subject_label,description,required,track) VALUES (?,?,?,?,?,?)').run(id,match[1],subject,desc,boolInt(body.required),str(body.track,100));audit(user,'create','exam_syllabus',id,body);var ee=db.prepare('SELECT * FROM exams WHERE id=?').get(match[1]);ok(res,mapExam(ee,ee.student_id||'',true),201);});
router.add('DELETE', /^\/api\/v1\/admin\/syllabus\/([^/]+)$/, ['admin'], function(req,res,match,body,user){db.prepare('DELETE FROM exam_syllabus WHERE id=?').run(match[1]);audit(user,'delete','exam_syllabus',match[1],{});ok(res,{deleted:true});});

router.add('GET', /^\/api\/v1\/admin\/exams\/([^/]+)\/questions$/, ['admin'], function(req,res,match){var qz=examQuiz(match[1]);if(!qz)return ok(res,[]);ok(res,db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order').all(qz.id));});
router.add('POST', /^\/api\/v1\/admin\/exams\/([^/]+)\/questions$/, ['admin'], function(req,res,match,body,user){var e=db.prepare('SELECT * FROM exams WHERE id=?').get(match[1]);if(!e)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');var qz=examQuiz(e.id);if(!qz){var qid=security.id('quiz'),t=now();db.prepare('INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)').run(qid,e.title,'آزمون اصلی',Math.max(1,num(e.duration_minutes,120)),e.id,t,t);qz=db.prepare('SELECT * FROM quizzes WHERE id=?').get(qid);}var opts=Array.isArray(body.options)?body.options:[];if(!str(body.question,2000)||opts.length!==4||['a','b','c','d'].indexOf(body.correctOption)<0)return fail(res,400,'VALIDATION','صورت سؤال، چهار گزینه و پاسخ صحیح لازم است.');var id=security.id('question'),sortOrder=num(body.sortOrder,Number(qz.question_count||0)+1);db.prepare('INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,qz.id,str(body.question,2000),str(opts[0],1000),str(opts[1],1000),str(opts[2],1000),str(opts[3],1000),body.correctOption,str(body.explanation,2000),sortOrder);audit(user,'create','exam_question',id,{examId:e.id});ok(res,{id:id},201);});
router.add('DELETE', /^\/api\/v1\/admin\/exams\/([^/]+)\/questions\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var qz=examQuiz(match[1]);if(!qz)return fail(res,404,'NOT_FOUND','آزمون پیدا نشد.');var r=db.prepare('DELETE FROM quiz_questions WHERE id=? AND quiz_id=?').run(match[2],qz.id);if(!r.changes)return fail(res,404,'NOT_FOUND','سؤال پیدا نشد.');audit(user,'delete','exam_question',match[2],{examId:match[1]});ok(res,{deleted:true});});

router.add('GET', /^\/api\/v1\/admin\/exam-attempt-requests$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120),sql=`SELECT r.*,e.title AS examTitle,s.name AS studentName FROM exam_attempt_requests r JOIN exams e ON e.id=r.exam_id JOIN students s ON s.id=r.student_id WHERE 1=1`,args=[];if(sid){sql+=' AND r.student_id=?';args.push(sid);}sql+=' ORDER BY CASE r.status WHEN \'pending\' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100';var st=db.prepare(sql);ok(res,st.all.apply(st,args));});
router.add('PATCH', /^\/api\/v1\/admin\/exam-attempt-requests\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var r=db.prepare('SELECT * FROM exam_attempt_requests WHERE id=?').get(match[1]);if(!r)return fail(res,404,'NOT_FOUND','درخواست پیدا نشد.');var status=['approved','rejected'].indexOf(body.status)>=0?body.status:null;if(!status)return fail(res,400,'VALIDATION','وضعیت معتبر نیست.');var t=now();db.prepare('UPDATE exam_attempt_requests SET status=?,advisor_note=?,updated_at=?,resolved_by=?,resolved_at=? WHERE id=?').run(status,str(body.advisorNote,1200),t,user.id,t,r.id);var e=db.prepare('SELECT title FROM exams WHERE id=?').get(r.exam_id);notifyStudent(r.student_id,status==='approved'?'تلاش مجدد آزمون تأیید شد':'درخواست تلاش مجدد بررسی شد',status==='approved'?'برای آزمون «'+(e?e.title:'')+'» یک تلاش اضافه تا ۲۴ ساعت فعال شد.':(str(body.advisorNote,1000)||'درخواست شما تأیید نشد.'));emitStudent(r.student_id,'exam.retry_reviewed',{examId:r.exam_id,requestId:r.id,status:status,resolvedAt:t});audit(user,'review','exam_attempt_request',r.id,{status:status});ok(res,{id:r.id,status:status,resolvedAt:t});});

router.add('GET', /^\/api\/v1\/admin\/reports$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,100),from=isoDateValid(q.from)?q.from:'0000-01-01',to=isoDateValid(q.to)?q.to:'9999-12-31';var sql=`SELECT dr.*,s.name AS student_name FROM daily_reports dr JOIN students s ON s.id=dr.student_id WHERE dr.plan_date BETWEEN ? AND ?`;var args=[from,to];if(sid){sql+=' AND dr.student_id=?';args.push(sid);}sql+=' ORDER BY dr.plan_date DESC,dr.updated_at DESC LIMIT 200';ok(res,db.prepare(sql).all.apply(db.prepare(sql),args));});

router.add('GET', /^\/api\/v1\/admin\/quizzes$/, ['admin'], function(req,res){var qs=db.prepare(`SELECT q.*,e.title AS exam_title,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS question_count FROM quizzes q LEFT JOIN exams e ON e.id=q.exam_id ORDER BY q.created_at DESC`).all();ok(res,qs);});
router.add('POST', /^\/api\/v1\/admin\/quizzes$/, ['admin'], function(req,res,match,body,user){var title=str(body.title,200);if(!title)return fail(res,400,'VALIDATION','عنوان آزمون لازم است.');var id=security.id('quiz'),t=now();db.prepare('INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id,title,str(body.subject,150),Math.max(1,num(body.durationMinutes,20)),str(body.examId,100)||null,1,t,t);audit(user,'create','quiz',id,body);ok(res,{id:id,title:title},201);});
router.add('PATCH', /^\/api\/v1\/admin\/quizzes\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var qz=db.prepare('SELECT * FROM quizzes WHERE id=?').get(match[1]);if(!qz)return fail(res,404,'NOT_FOUND','آزمونک پیدا نشد.');var map={title:'title',subject:'subject',durationMinutes:'duration_minutes',examId:'exam_id',active:'active'};Object.keys(map).forEach(function(k){if(Object.prototype.hasOwnProperty.call(body,k)){var val=(k==='durationMinutes')?Math.max(1,num(body[k],20)):(k==='active'?boolInt(body[k]):str(body[k],200)||null);db.prepare('UPDATE quizzes SET '+map[k]+'=?,updated_at=? WHERE id=?').run(val,now(),qz.id);}});audit(user,'update','quiz',qz.id,body);ok(res,db.prepare('SELECT * FROM quizzes WHERE id=?').get(qz.id));});
router.add('GET', /^\/api\/v1\/admin\/quizzes\/([^/]+)\/questions$/, ['admin'], function(req,res,match){ok(res,db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order').all(match[1]));});
router.add('POST', /^\/api\/v1\/admin\/quizzes\/([^/]+)\/questions$/, ['admin'], function(req,res,match,body,user){if(!db.prepare('SELECT id FROM quizzes WHERE id=?').get(match[1]))return fail(res,404,'NOT_FOUND','آزمونک پیدا نشد.');var opts=body.options||[];if(!str(body.question,1000)||opts.length<4||['a','b','c','d'].indexOf(body.correctOption)<0)return fail(res,400,'VALIDATION','سؤال، چهار گزینه و پاسخ صحیح لازم است.');var id=security.id('question');db.prepare('INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,match[1],str(body.question,2000),str(opts[0],1000),str(opts[1],1000),str(opts[2],1000),str(opts[3],1000),body.correctOption,str(body.explanation,2000),num(body.sortOrder,999));audit(user,'create','question',id,{});ok(res,{id:id},201);});
router.add('DELETE', /^\/api\/v1\/admin\/questions\/([^/]+)$/, ['admin'], function(req,res,match,body,user){db.prepare('DELETE FROM quiz_questions WHERE id=?').run(match[1]);audit(user,'delete','question',match[1],{});ok(res,{deleted:true});});


router.add('GET', /^\/api\/v1\/admin\/live$/, ['admin'], function(req,res){
  var q=query(req),sid=str(q.studentId,120);if(!sid){var first=db.prepare('SELECT id FROM students WHERE active=1 ORDER BY created_at LIMIT 1').get();sid=first?first.id:'';}if(!sid)return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');var student=db.prepare('SELECT id,name,grade,major FROM students WHERE id=?').get(sid);if(!student)return fail(res,404,'NOT_FOUND','دانش‌آموز پیدا نشد.');var plan=db.prepare('SELECT * FROM plans WHERE student_id=? AND plan_date=? LIMIT 1').get(sid,todayIso());var activities=db.prepare('SELECT * FROM activity_events WHERE student_id=? ORDER BY created_at DESC LIMIT 50').all(sid);var issues=db.prepare("SELECT ti.*,t.subject,t.title FROM task_issues ti LEFT JOIN tasks t ON t.id=ti.task_id WHERE ti.student_id=? AND ti.status='open' ORDER BY ti.created_at DESC").all(sid);ok(res,{student:student,presence:getPresence(sid),activeSession:activeStudySession(sid),todayPlan:mapPlan(plan,sid),issues:issues,activity:mapActivityRows(activities),dueReviews:getDueReviews(sid,20)});
});
router.add('GET', /^\/api\/v1\/admin\/activity$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120),limit=Math.min(300,Math.max(1,num(q.limit,100)));if(!sid)return fail(res,400,'VALIDATION','studentId لازم است.');ok(res,mapActivityRows(db.prepare('SELECT * FROM activity_events WHERE student_id=? ORDER BY created_at DESC LIMIT ?').all(sid,limit)));});
router.add('GET', /^\/api\/v1\/admin\/advisor-inbox$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120);if(!sid)return fail(res,400,'VALIDATION','studentId لازم است.');var issues=db.prepare(`SELECT ti.*,t.subject,t.title FROM task_issues ti LEFT JOIN tasks t ON t.id=ti.task_id WHERE ti.student_id=? AND ti.status='open' ORDER BY ti.created_at DESC`).all(sid);var recovery=db.prepare("SELECT * FROM recovery_requests WHERE student_id=? AND status='pending' ORDER BY created_at DESC").all(sid);var reviews=getDueReviews(sid,30);var missed=db.prepare(`SELECT t.id,t.subject,t.title,p.plan_date AS planDate,t.start_time AS start,t.end_time AS end FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=? WHERE p.student_id=? AND p.plan_date<? AND p.published=1 AND tc.id IS NULL ORDER BY p.plan_date DESC LIMIT 30`).all(sid,sid,todayIso());var examRetryRequests=db.prepare(`SELECT r.*,e.title AS examTitle FROM exam_attempt_requests r JOIN exams e ON e.id=r.exam_id WHERE r.student_id=? AND r.status='pending' ORDER BY r.created_at DESC`).all(sid);ok(res,{issues:issues,recoveryRequests:recovery,reviews:reviews,missedTasks:missed,examRetryRequests:examRetryRequests});});
router.add('PATCH', /^\/api\/v1\/admin\/task-issues\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var issue=db.prepare('SELECT * FROM task_issues WHERE id=?').get(match[1]);if(!issue)return fail(res,404,'NOT_FOUND','گزارش مشکل پیدا نشد.');var status=['open','resolved','dismissed'].indexOf(body.status)>=0?body.status:issue.status;db.prepare('UPDATE task_issues SET status=?,advisor_note=?,updated_at=? WHERE id=?').run(status,str(body.advisorNote,1500),now(),issue.id);if(str(body.advisorNote,1500))notifyStudent(issue.student_id,'پاسخ مشاور',str(body.advisorNote,1000));audit(user,'update','task_issue',issue.id,{status:status});ok(res,{id:issue.id,status:status});});
router.add('POST', /^\/api\/v1\/admin\/comments$/, ['admin'], function(req,res,match,body,user){var sid=str(body.studentId,120),text=str(body.body,2000),taskId=str(body.taskId,120)||null;if(!sid||!text)return fail(res,400,'VALIDATION','studentId و متن لازم است.');var id=security.id('comment');db.prepare('INSERT INTO advisor_comments (id,student_id,task_id,body,visible_to_student,created_by,created_at) VALUES (?,?,?,?,?,?,?)').run(id,sid,taskId,text,body.visibleToStudent===false?0:1,user.id,now());if(body.visibleToStudent!==false){notifyStudent(sid,'پیام مشاور',text);emitStudent(sid,'advisor.comment.created',{id:id,taskId:taskId,body:text,createdAt:now()});}audit(user,'create','advisor_comment',id,{studentId:sid,taskId:taskId});ok(res,{id:id},201);});
router.add('GET', /^\/api\/v1\/admin\/comments$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120);if(!sid)return fail(res,400,'VALIDATION','studentId لازم است.');var sql='SELECT * FROM advisor_comments WHERE student_id=?',args=[sid];if(q.taskId){sql+=' AND task_id=?';args.push(str(q.taskId,120));}sql+=' ORDER BY created_at DESC LIMIT 100';var st=db.prepare(sql);ok(res,st.all.apply(st,args));});
router.add('GET', /^\/api\/v1\/admin\/reviews$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120);if(!sid)return fail(res,400,'VALIDATION','studentId لازم است.');ok(res,getDueReviews(sid,100));});
router.add('POST', /^\/api\/v1\/admin\/plans\/publish-range$/, ['admin'], function(req,res,match,body,user){var sid=str(body.studentId,120),from=str(body.from,10),to=str(body.to,10);if(!sid||!isoDateValid(from)||!isoDateValid(to))return fail(res,400,'VALIDATION','studentId/from/to لازم است.');var published=body.published===false?0:1;var r=db.prepare('UPDATE plans SET published=?,updated_at=? WHERE student_id=? AND plan_date BETWEEN ? AND ?').run(published,now(),sid,from,to);if(published){notifyStudent(sid,'برنامه منتشر شد','برنامه جدید برای بازه '+from+' تا '+to+' آماده است.');emitStudent(sid,'plan.published',{from:from,to:to,count:r.changes});}audit(user,'publish_range','plan',sid,{from:from,to:to,published:!!published,count:r.changes});ok(res,{updated:r.changes,published:!!published});});
router.add('GET', /^\/api\/v1\/admin\/import\/template$/, ['admin'], function(req,res){var q=query(req),sid=str(q.studentId,120)||'student_sister',d=addIsoDays(todayIso(),7);ok(res,{schemaVersion:2,studentId:sid,plans:[{planDate:todayIso(),jalaliId:'',dayLabel:'',persianDate:'',title:'برنامه روزانه',motivationText:'امروز فقط روی قدم بعدی تمرکز کن؛ پیشرفت از همین قدم‌های کوچک ساخته می‌شود.',published:false,tasks:[{start:'07:00',end:'08:00',type:'study',subject:'روان‌شناسی',title:'مطالعه درس',pages:'',testCount:0,note:'',quizId:null},{start:'08:10',end:'08:35',type:'exam',subject:'روان‌شناسی',title:'آزمون نمونه',testCount:10,note:'بعد از مطالعه، همین‌جا آزمون را باز کن.',examRef:'exam-sample'}]}],exams:[{ref:'exam-sample',title:'آزمون نمونه',persianDate:'',isoDate:d,openAt:d+'T08:00:00+03:30',closeAt:d+'T12:00:00+03:30',durationMinutes:120,maxAttempts:1,published:true,note:'',instructions:'پس از شروع، زمان آزمون ادامه پیدا می‌کند. آزمون فقط یک‌بار قابل انجام است.',status:'upcoming',syllabus:[{subject:'روان‌شناسی',description:'درس ۱',required:true,track:''}],questions:[{question:'نمونه سؤال را با سؤال واقعی جایگزین کنید.',options:['گزینه ۱','گزینه ۲','گزینه ۳','گزینه ۴'],correctOption:'a',explanation:'توضیح پاسخ'}]}]});});
router.add('POST', /^\/api\/v1\/admin\/import\/preview$/, ['admin'], function(req,res,match,body,user){var normalized=normalizeImportPayload(body.data||body,body.studentId||'');ok(res,normalized);});
router.add('POST', /^\/api\/v1\/admin\/import\/commit$/, ['admin'], function(req,res,match,body,user){var normalized=normalizeImportPayload(body.data||{},body.studentId||'');if(normalized.errors.length)return fail(res,400,'IMPORT_VALIDATION','JSON import validation failed.',normalized.errors);try{ok(res,commitImport(normalized,{replaceExistingPlans:!!body.replaceExistingPlans,replaceExistingExams:!!body.replaceExistingExams,publishImported:!!body.publishImported,sourceName:str(body.sourceName,200)},user),201);}catch(e){if(String(e.message).indexOf('PLAN_EXISTS:')===0||String(e.message).indexOf('EXAM_EXISTS:')===0)return fail(res,409,'IMPORT_CONFLICT',String(e.message));throw e;}});
router.add('GET', /^\/api\/v1\/admin\/import\/history$/, ['admin'], function(req,res){ok(res,db.prepare(`SELECT di.*,s.name AS studentName,u.display_name AS createdByName FROM data_imports di LEFT JOIN students s ON s.id=di.student_id LEFT JOIN users u ON u.id=di.created_by ORDER BY di.created_at DESC LIMIT 100`).all());});

router.add('GET', /^\/api\/v1\/admin\/app-versions$/, ['admin'], function(req,res){ok(res,db.prepare('SELECT * FROM app_versions ORDER BY app_name').all());});
router.add('PUT', /^\/api\/v1\/admin\/app-versions\/([^/]+)$/, ['admin'], function(req,res,match,body,user){var version=str(body.version,80);if(!version)return fail(res,400,'VALIDATION','نسخه لازم است.');db.prepare(`INSERT INTO app_versions (app_name,version,updated_at) VALUES (?,?,?) ON CONFLICT(app_name) DO UPDATE SET version=excluded.version,updated_at=excluded.updated_at`).run(match[1],version,now());audit(user,'update','app_version',match[1],{version:version});ok(res,{app:match[1],version:version});});

router.add('GET', /^\/api\/v1\/admin\/app-releases$/, ['admin'], function(req,res){ok(res,db.prepare('SELECT * FROM app_releases ORDER BY updated_at DESC LIMIT 50').all());});
router.add('PUT', /^\/api\/v1\/admin\/app-releases\/([^/]+)$/, ['admin'], function(req,res,match,body,user){
  var version=str(body.version,80),notes=str(body.notes,2000);if(!version)return fail(res,400,'VALIDATION','نسخه لازم است.');var t=now();
  db.prepare(`INSERT INTO app_releases (app_name,version,notes,updated_at) VALUES (?,?,?,?) ON CONFLICT(app_name,version) DO UPDATE SET notes=excluded.notes,updated_at=excluded.updated_at`).run(match[1],version,notes,t);
  db.prepare(`INSERT INTO app_versions (app_name,version,updated_at) VALUES (?,?,?) ON CONFLICT(app_name) DO UPDATE SET version=excluded.version,updated_at=excluded.updated_at`).run(match[1],version,t);audit(user,'release','app',match[1],{version:version});ok(res,{app:match[1],version:version,notes:notes});
});

router.add('GET', /^\/api\/v1\/admin\/audit$/, ['admin'], function(req,res){ok(res,db.prepare(`SELECT a.*,u.display_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100`).all());});

function handle(req, res) {
  setSecurityHeaders(res);
  if (!setCors(req,res)) return fail(res,403,'CORS','Origin is not allowed.');
  if (req.method === 'OPTIONS') { res.statusCode=204; return res.end(); }
  var found = router.match(req);
  if (!found) return fail(res,404,'NOT_FOUND','مسیر API پیدا نشد.');
  var needsBody = ['POST','PUT','PATCH'].indexOf(req.method) >= 0;
  function run(body) {
    var user = found.route.roles ? requireAuth(req,res,found.route.roles) : null;
    if (found.route.roles && !user) return;
    if (found.route.roles && !validCsrf(req,user)) return fail(res,403,'CSRF','درخواست امنیتی معتبر نیست. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.');
    try {
      var result=found.route.handler(req,res,found.match,body || {},user);
      if(result&&typeof result.then==='function')result.catch(function(e){console.error(e);if(!res.writableEnded)fail(res,500,'INTERNAL','خطای داخلی سرور.',env.nodeEnv==='development'?String(e.stack||e):null);});
    } catch (e) { console.error(e); if (!res.writableEnded) fail(res,500,'INTERNAL','خطای داخلی سرور.', env.nodeEnv==='development'?String(e.stack||e):null); }
  }
  if (needsBody) parseBody(req,function(err,body){if(err){if(!res.writableEnded)fail(res,err.message==='BODY_TOO_LARGE'?413:400,err.message,err.message==='INVALID_JSON'?'JSON نامعتبر است.':'درخواست نامعتبر است.');return;}run(body);}); else run({});
}

cleanupSessions();
realtime.cleanup(db,new Date(Date.now()-env.eventRetentionHours*3600000).toISOString());
setInterval(function(){cleanupSessions();realtime.cleanup(db,new Date(Date.now()-env.eventRetentionHours*3600000).toISOString());},3600000).unref();
var server = http.createServer(handle);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.listen(env.port, '0.0.0.0', function(){
  console.log('=========================================');
  console.log('Moshaver | مشاور API started');
  console.log('Version: ' + env.version);
  console.log('Node: ' + process.version);
  console.log('Environment: ' + env.nodeEnv);
  console.log('Listening: 0.0.0.0:' + env.port);
  console.log('SQLite: ' + env.databasePath);
  console.log('PID: ' + process.pid);
  console.log('Health: /health and /api/v1/health');
  console.log('=========================================');
  if (env.nodeEnv !== 'production') {
    console.log('Dev admin: ' + env.adminUsername + ' / ' + env.adminPassword);
    console.log('Dev student: ' + env.studentUsername + ' / ' + env.studentPassword);
  }
});

var shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Received ' + signal + '; shutting down gracefully...');
  realtime.closeAll();
  server.close(function(){
    try { db.close(); } catch(e) {}
    console.log('HTTP server and SQLite closed.');
    process.exit(0);
  });
  setTimeout(function(){
    console.error('Graceful shutdown timed out; forcing exit.');
    process.exit(1);
  },10000).unref();
}
process.on('SIGTERM', function(){ shutdown('SIGTERM'); });
process.on('SIGINT', function(){ shutdown('SIGINT'); });
process.on('uncaughtException', function(err){
  console.error('Uncaught exception:', err && err.stack ? err.stack : err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', function(reason){
  console.error('Unhandled rejection:', reason);
});
