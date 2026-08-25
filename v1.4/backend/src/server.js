"use strict";

var http = require("http");
var url = require("url");
var env = require("./env");
var database = require("./db");
var db = database.db;
var now = database.now;
var security = require("./security");
var permissions = require("./permissions");
var Router = require("./router");
var registerAdminRoutes = require("./routes/admin.routes");
var registerActivityRoutes = require("./routes/activity.routes");
var registerAuthRoutes = require("./routes/auth.routes");
var registerChatRoutes = require("./routes/chat.routes");
var registerGroupChatRoutes = require("./routes/group-chat.routes");
var registerExamsRoutes = require("./routes/exams.routes");
var registerImportsRoutes = require("./routes/imports.routes");
var registerLearningRoutes = require("./routes/learning.routes");
var registerNotificationsRoutes = require("./routes/notifications.routes");
var registerPlansRoutes = require("./routes/plans.routes");
var registerRecoveryRoutes = require("./routes/recovery.routes");
var registerRealtimeRoutes = require("./routes/realtime.routes");
var registerReportsRoutes = require("./routes/reports.routes");
var registerReviewsRoutes = require("./routes/reviews.routes");
var registerStudyRoutes = require("./routes/study.routes");
var registerStudentsRoutes = require("./routes/students.routes");
var registerStudentDashboardRoutes = require("./routes/student-dashboard.routes");
var registerSubjectsRoutes = require("./routes/subjects.routes");
var registerSystemRoutes = require("./routes/system.routes");
var registerSystemAdminRoutes = require("./routes/system-admin.routes");
var registerTasksRoutes = require("./routes/tasks.routes");
var createActivityService = require("./services/activity.service");
var createChatService = require("./services/chat.service");
var createGroupChatService = require("./services/group-chat.service");
var createExamsService = require("./services/exams.service");
var createLearningService = require("./services/learning.service");
var createPlansService = require("./services/plans.service");
var createStudentDashboardService = require("./services/student-dashboard.service");
var createDatabaseBackupService = require("./services/database-backup.service");
var createPushService = require("./services/push.service");

var realtime = require("./realtime");
var router = new Router();
var MAX_BODY = 1024 * 1024;
var rateBuckets = Object.create(null);

function send(res, status, payload) {
  if (res.writableEnded) return;
  var body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function ok(res, data, status) {
  send(res, status || 200, { ok: true, data: data });
}
function fail(res, status, code, message, details) {
  send(res, status, {
    ok: false,
    error: { code: code, message: message, details: details || null },
  });
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (env.production)
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
}

function setCors(req, res) {
  var origin = req.headers.origin;
  if (!origin) return true;
  var allowed =
    env.corsOrigins.indexOf("*") >= 0 || env.corsOrigins.indexOf(origin) >= 0;
  if (!allowed) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-CSRF-Token, Cache-Control, Pragma",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

function parseBody(req, callback) {
  var chunks = [],
    size = 0,
    called = false;
  function done(err, body) {
    if (called) return;
    called = true;
    callback(err, body);
  }
  req.on("data", function (chunk) {
    size += chunk.length;
    if (size > MAX_BODY) {
      done(new Error("BODY_TOO_LARGE"));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    if (called) return;
    if (!chunks.length) return done(null, {});
    try {
      done(null, JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } catch (e) {
      done(new Error("INVALID_JSON"));
    }
  });
  req.on("error", function (err) {
    done(err);
  });
}

function query(req) {
  return url.parse(req.url, true).query || {};
}
function str(v, max) {
  var s = v == null ? "" : String(v).trim();
  return max ? s.slice(0, max) : s;
}
function num(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : fallback || 0;
}
function boolInt(v) {
  return v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
}
function isoDateValid(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}
function dateTimeValid(v) {
  return !!v && !isNaN(new Date(v).getTime());
}
function timeValid(v) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));
}
function isMutating(method) {
  return (
    ["POST", "PUT", "PATCH", "DELETE"].indexOf(
      String(method || "").toUpperCase(),
    ) >= 0
  );
}

function parseCookies(req) {
  var out = {},
    raw = String(req.headers.cookie || "");
  raw.split(";").forEach(function (part) {
    var i = part.indexOf("=");
    if (i < 1) return;
    var k = part.slice(0, i).trim(),
      v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch (e) {
      out[k] = v;
    }
  });
  return out;
}
function cookieString(name, value, maxAge) {
  var parts = [
    name + "=" + encodeURIComponent(value || ""),
    "Path=/",
    "HttpOnly",
    "SameSite=" + env.cookieSameSite,
  ];
  if (env.cookieSecure) parts.push("Secure");
  if (env.cookieDomain) parts.push("Domain=" + env.cookieDomain);
  if (typeof maxAge === "number")
    parts.push("Max-Age=" + Math.max(0, Math.floor(maxAge)));
  return parts.join("; ");
}
function setSessionCookie(res, token, maxAgeSeconds) {
  res.setHeader(
    "Set-Cookie",
    cookieString(env.sessionCookieName, token, maxAgeSeconds),
  );
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", cookieString(env.sessionCookieName, "", 0));
}
function clientIp(req) {
  if (env.trustProxy) {
    var f = String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim();
    if (f) return f.slice(0, 100);
  }
  return str(req.socket && req.socket.remoteAddress, 100) || "unknown";
}
function userAgent(req) {
  return str(req.headers["user-agent"], 300);
}

function cleanupSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
}

function authFromReq(req) {
  var cookies = parseCookies(req),
    token = cookies[env.sessionCookieName] || "",
    mode = "cookie";
  if (!token && env.allowBearerAuth) {
    var header = String(req.headers.authorization || "");
    if (header.indexOf("Bearer ") === 0) {
      token = header.slice(7).trim();
      mode = "bearer";
    }
  }
  if (!token) return null;
  var row = db
    .prepare(
      `SELECT s.id AS session_id,s.expires_at,s.csrf_hash,s.csrf_token,s.ip_address,s.user_agent,u.id,u.username,u.role,u.display_name,u.student_id,u.is_active
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1`,
    )
    .get(security.hashToken(token));
  if (!row || !row.is_active || row.expires_at <= now()) return null;
  db.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").run(
    now(),
    row.session_id,
  );
  row.auth_mode = mode;
  return row;
}

function requireAuth(req, res, roles) {
  var user = authFromReq(req);
  if (!user) {
    fail(res, 401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    return null;
  }
  if (!permissions.hasRole(user, roles)) {
    fail(res, 403, "FORBIDDEN", "دسترسی کافی ندارید.");
    return null;
  }
  return user;
}
function ensureCsrf(sessionId) {
  var row = db
    .prepare("SELECT csrf_token FROM sessions WHERE id=?")
    .get(sessionId);
  if (row && row.csrf_token) return row.csrf_token;
  var raw = security.newCsrfToken();
  // Atomic lazy migration: concurrent /auth/me requests converge on the same token
  // instead of rotating the token and invalidating in-flight mutations.
  db.prepare(
    `UPDATE sessions SET csrf_token=?,csrf_hash=?
    WHERE id=? AND (csrf_token IS NULL OR csrf_token='')`,
  ).run(raw, security.hashToken(raw), sessionId);
  row = db.prepare("SELECT csrf_token FROM sessions WHERE id=?").get(sessionId);
  return row && row.csrf_token ? row.csrf_token : raw;
}
function validCsrf(req, user) {
  if (!user || user.auth_mode !== "cookie" || !isMutating(req.method))
    return true;
  // Logout is intentionally CSRF-exempt. With the HttpOnly SameSite session
  // cookie this can at worst sign the current browser out, and it makes logout
  // reliable even after a stale/cleared CSRF token.
  if (url.parse(req.url).pathname === "/api/v1/auth/logout") return true;
  var token = str(req.headers["x-csrf-token"], 300);
  if (!token) return false;
  if (user.csrf_token) return security.safeEqualText(token, user.csrf_token);
  return (
    !!user.csrf_hash &&
    security.safeEqualText(security.hashToken(token), user.csrf_hash)
  );
}

function audit(user, action, entityType, entityId, details) {
  try {
    db.prepare(
      "INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?,?,?,?,?,?,?)",
    ).run(
      security.id("audit"),
      user ? user.id : null,
      action,
      entityType || null,
      entityId || null,
      JSON.stringify(details || {}),
      now(),
    );
  } catch (e) {
    console.error("audit failed:", e.message);
  }
}

function bucketAllow(key, max, windowMs) {
  var t = Date.now(),
    b = rateBuckets[key];
  if (!b || t - b.start >= windowMs)
    b = rateBuckets[key] = { start: t, count: 0 };
  b.count++;
  return b.count <= max;
}
function loginKeys(req, username) {
  var ip = clientIp(req);
  return [
    "ip:" + ip,
    "login:" + ip + ":" + String(username || "").toLowerCase(),
  ];
}
function rateRow(key) {
  return db.prepare("SELECT * FROM auth_rate_limits WHERE rate_key=?").get(key);
}
function isLoginBlocked(keys) {
  var t = Date.now();
  for (var i = 0; i < keys.length; i++) {
    var r = rateRow(keys[i]);
    if (r && r.blocked_until && new Date(r.blocked_until).getTime() > t)
      return r.blocked_until;
  }
  return null;
}
function loginFailure(keys) {
  var t = new Date(),
    windowMs = env.loginWindowMinutes * 60000,
    blockMs = env.loginBlockMinutes * 60000;
  keys.forEach(function (key) {
    var r = rateRow(key),
      start = r ? new Date(r.window_started_at).getTime() : 0,
      failures = r ? Number(r.failures || 0) : 0;
    if (!r || Date.now() - start > windowMs) {
      start = Date.now();
      failures = 0;
    }
    failures++;
    var blocked =
      failures >= env.loginMaxFailures
        ? new Date(Date.now() + blockMs).toISOString()
        : null;
    db.prepare(
      `INSERT INTO auth_rate_limits (rate_key,failures,window_started_at,blocked_until,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(rate_key) DO UPDATE SET failures=excluded.failures,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at`,
    ).run(
      key,
      failures,
      new Date(start).toISOString(),
      blocked,
      t.toISOString(),
    );
  });
}
function loginSuccess(keys) {
  keys.forEach(function (k) {
    db.prepare("DELETE FROM auth_rate_limits WHERE rate_key=?").run(k);
  });
}
function getStudentIdForUser(user, requested) {
  if (user.role === "student") return user.student_id;
  return requested || null;
}

function getSubjects(studentId) {
  return db
    .prepare(
      `SELECT s.id,s.subject_key AS subjectKey,s.name,ss.status,ss.progress,ss.mastery,ss.note
    FROM subjects s LEFT JOIN student_subjects ss ON ss.subject_id=s.id AND ss.student_id=? ORDER BY s.display_order,s.name`,
    )
    .all(studentId);
}

function getReport(studentId, date) {
  return (
    db
      .prepare("SELECT * FROM daily_reports WHERE student_id=? AND plan_date=?")
      .get(studentId, date) || null
  );
}

var pushService = createPushService({ db: db, env: env, now: now });
var activityService = createActivityService({
  db: db,
  security: security,
  realtime: realtime,
  now: now,
  str: str,
  safeJsonParse: safeJsonParse,
  pushService: pushService,
});

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch (e) {
    return fallback == null ? {} : fallback;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addIsoDays(date, days) {
  var d = new Date(String(date || todayIso()) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function iranDayBounds(date) {
  var start = new Date(String(date) + "T00:00:00+03:30");
  var end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}
function objectiveDailyMetrics(studentId, date) {
  var b = iranDayBounds(date);
  var study = db
    .prepare(
      "SELECT COALESCE(SUM(actual_minutes),0) AS minutes FROM study_sessions WHERE student_id=? AND status='finished' AND started_at>=? AND started_at<?",
    )
    .get(studentId, b.start, b.end);
  var quiz = db
    .prepare(
      "SELECT COALESCE(SUM(correct),0) AS correct,COALESCE(SUM(wrong),0) AS wrong,COALESCE(SUM(blank),0) AS blank FROM quiz_attempts WHERE student_id=? AND submitted_at>=? AND submitted_at<?",
    )
    .get(studentId, b.start, b.end);
  var minutes = Number(study.minutes || 0),
    correct = Number(quiz.correct || 0),
    wrong = Number(quiz.wrong || 0),
    blank = Number(quiz.blank || 0);
  return {
    studyMinutes: minutes,
    studyHours: (minutes / 60).toFixed(1),
    tests: correct + wrong + blank,
    correct: correct,
    wrong: wrong,
    blank: blank,
  };
}

function getDueReviews(studentId, limit) {
  return db
    .prepare(
      `SELECT r.id,r.due_date AS dueDate,r.interval_days AS intervalDays,r.status,r.completed_at AS completedAt,
    es.subject_label AS subject,es.description,e.title AS examTitle,e.id AS examId,r.syllabus_id AS syllabusId
    FROM review_items r LEFT JOIN exam_syllabus es ON es.id=r.syllabus_id LEFT JOIN exams e ON e.id=es.exam_id
    WHERE r.student_id=? AND r.status='pending' AND r.due_date<=? ORDER BY r.due_date LIMIT ?`,
    )
    .all(
      studentId,
      todayIso(),
      Math.min(100, Math.max(1, Number(limit || 20))),
    );
}

function scheduleReviews(studentId, syllabusId, baseDate) {
  var intervals = [1, 3, 7, 14],
    t = now();
  intervals.forEach(function (days) {
    db.prepare(
      `INSERT OR IGNORE INTO review_items (id,student_id,syllabus_id,due_date,interval_days,status,completed_at,created_at)
      VALUES (?,?,?,?,?,'pending',NULL,?)`,
    ).run(
      security.id("review"),
      studentId,
      syllabusId,
      addIsoDays(baseDate || todayIso(), days),
      days,
      t,
    );
  });
}

var chatService = createChatService({
  db: db,
  security: security,
  now: now,
  getPresence: activityService.getPresence,
});
var groupChatService = createGroupChatService({db:db,security:security,now:now,env:env,realtime:realtime});
var learningService = createLearningService({
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  todayIso: todayIso,
});
var examsService = createExamsService({
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  boolInt: boolInt,
  isoDateValid: isoDateValid,
  todayIso: todayIso,
  scheduleReviews: scheduleReviews,
  touchPresence: activityService.touchPresence,
  recordActivity: activityService.recordActivity,
  notifyStudent: activityService.notifyStudent,
  learning: learningService,
});
var plansService = createPlansService({
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  boolInt: boolInt,
  timeValid: timeValid,
  getSubjects: getSubjects,
  getReport: getReport,
  examProgress: examsService.examProgress,
});
var studentDashboardService = createStudentDashboardService({
  db: db,
  todayIso: todayIso,
  mapPlan: plansService.mapPlan,
  planMetrics: plansService.planMetrics,
  getPresence: activityService.getPresence,
  activeStudySession: activityService.activeStudySession,
});
var databaseBackupService = createDatabaseBackupService({ db: db, env: env, now: now });

// Public root and health endpoints are intentionally simple so PaaS/gateway
// health checks can verify the service without authentication.
registerSystemRoutes(router, {
  env: env,
  db: db,
  now: now,
  ok: ok,
});

registerSystemAdminRoutes(router, {
  db: db,
  env: env,
  now: now,
  ok: ok,
  fail: fail,
  audit: audit,
  bucketAllow: bucketAllow,
  realtime: realtime,
  backup: databaseBackupService,
});

registerAuthRoutes(router, {
  db: db,
  env: env,
  security: security,
  now: now,
  str: str,
  ok: ok,
  fail: fail,
  audit: audit,
  clientIp: clientIp,
  userAgent: userAgent,
  parseCookies: parseCookies,
  setSessionCookie: setSessionCookie,
  clearSessionCookie: clearSessionCookie,
  cleanupSessions: cleanupSessions,
  loginKeys: loginKeys,
  isLoginBlocked: isLoginBlocked,
  loginFailure: loginFailure,
  loginSuccess: loginSuccess,
  ensureCsrf: ensureCsrf,
});

registerRealtimeRoutes(router, {
  db: db,
  realtime: realtime,
});

registerNotificationsRoutes(router, {
  db: db,
  ok: ok,
  fail: fail,
  security: security,
  realtime: realtime,
  now: now,
  str: str,
  userAgent: userAgent,
  pushService: pushService,
});

registerSubjectsRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  ok: ok,
  fail: fail,
  audit: audit,
  getSubjects: getSubjects,
});

registerImportsRoutes(router, {
  db: db,
  str: str,
  query: query,
  ok: ok,
  fail: fail,
  todayIso: todayIso,
  addIsoDays: addIsoDays,
  num: num,
  isoDateValid: isoDateValid,
  dateTimeValid: dateTimeValid,
  timeValid: timeValid,
  security: security,
  now: now,
  notifyStudent: activityService.notifyStudent,
  emitStudent: activityService.emitStudent,
  audit: audit,
});

registerAdminRoutes(router, {
  db: db,
  now: now,
  str: str,
  num: num,
  query: query,
  ok: ok,
  fail: fail,
  audit: audit,
  todayIso: todayIso,
  mapPlan: plansService.mapPlan,
  getPresence: activityService.getPresence,
  activeStudySession: activityService.activeStudySession,
  mapActivityRows: activityService.mapActivityRows,
  getDueReviews: getDueReviews,
  getLearningSummary: learningService.summary,
});

registerChatRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  query: query,
  ok: ok,
  fail: fail,
  audit: audit,
  bucketAllow: bucketAllow,
  emitAdmin: activityService.emitAdmin,
  emitStudent: activityService.emitStudent,
  notifyStudent: activityService.notifyStudent,
  getOrCreateConversation: chatService.getOrCreateConversation,
  canUseConversation: chatService.canUseConversation,
  getReadAt: chatService.getReadAt,
  markConversationRead: chatService.markConversationRead,
  conversationUnread: chatService.conversationUnread,
  mapChatMessage: chatService.mapChatMessage,
  chatMessages: chatService.chatMessages,
  adminChatList: chatService.adminChatList,
  emitConversation: groupChatService.emitToMembers,
  emitUser: function(userId,type,payload){return realtime.emitUser(db,userId,type,payload,now);},
  notifyUser: activityService.notifyUser,
  notifyAdmins: function(title,body,options){db.prepare("SELECT id FROM users WHERE role='admin' AND is_active=1").all().forEach(function(admin){activityService.notifyUser(admin.id,title,body,options);});},
});

registerGroupChatRoutes(router, {
  db:db,security:security,now:now,str:str,query:query,ok:ok,fail:fail,audit:audit,
  bucketAllow:bucketAllow,groups:groupChatService,env:env,realtime:realtime,
  canUseConversation:chatService.canUseConversation,getOrCreateConversation:chatService.getOrCreateConversation,
  conversationUnread:chatService.conversationUnread,todayIso:todayIso,iranDayBounds:iranDayBounds,
  notifyUser:activityService.notifyUser
});

registerReportsRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  query: query,
  isoDateValid: isoDateValid,
  ok: ok,
  fail: fail,
  recordActivity: activityService.recordActivity,
  objectiveDailyMetrics: objectiveDailyMetrics,
  getReport: getReport,
});

registerStudyRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  ok: ok,
  fail: fail,
  touchPresence: activityService.touchPresence,
  recordActivity: activityService.recordActivity,
  activeStudySession: activityService.activeStudySession,
});

registerActivityRoutes(router, {
  str: str,
  ok: ok,
  fail: fail,
  bucketAllow: bucketAllow,
  touchPresence: activityService.touchPresence,
  recordActivity: activityService.recordActivity,
});

registerReviewsRoutes(router, {
  db: db,
  now: now,
  str: str,
  query: query,
  ok: ok,
  fail: fail,
  recordActivity: activityService.recordActivity,
  getDueReviews: getDueReviews,
});

registerLearningRoutes(router, {
  query: query,
  str: str,
  ok: ok,
  fail: fail,
  audit: audit,
  learning: learningService,
  recordActivity: activityService.recordActivity,
  notifyStudent: activityService.notifyStudent,
  emitStudent: activityService.emitStudent,
});

registerRecoveryRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  isoDateValid: isoDateValid,
  ok: ok,
  fail: fail,
  audit: audit,
  notifyStudent: activityService.notifyStudent,
  recordActivity: activityService.recordActivity,
});

registerTasksRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  query: query,
  ok: ok,
  fail: fail,
  audit: audit,
  recordActivity: activityService.recordActivity,
  notifyStudent: activityService.notifyStudent,
  emitStudent: activityService.emitStudent,
});

registerStudentsRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  boolInt: boolInt,
  query: query,
  num: num,
  ok: ok,
  fail: fail,
  audit: audit,
  getSubjects: getSubjects,
  mapPlan: plansService.mapPlan,
  getPlanMetrics: plansService.planMetrics,
  getExamProgress: examsService.examProgress,
});

registerStudentDashboardRoutes(router, {
  ok: ok,
  fail: fail,
  query: query,
  dashboard: studentDashboardService,
});

registerPlansRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  query: query,
  boolInt: boolInt,
  isoDateValid: isoDateValid,
  timeValid: timeValid,
  ok: ok,
  fail: fail,
  audit: audit,
  notifyStudent: activityService.notifyStudent,
  emitStudent: activityService.emitStudent,
  mapPlan: plansService.mapPlan,
  studentDashboard: plansService.dashboard,
  getSubjects: getSubjects,
  getReport: getReport,
  examProgress: examsService.examProgress,
});

registerExamsRoutes(router, {
  db: db,
  security: security,
  now: now,
  str: str,
  num: num,
  query: query,
  isoDateValid: isoDateValid,
  ok: ok,
  fail: fail,
  audit: audit,
  notifyStudent: activityService.notifyStudent,
  emitAdmin: activityService.emitAdmin,
  emitStudent: activityService.emitStudent,
  recordActivity: activityService.recordActivity,
  touchPresence: activityService.touchPresence,
  todayIso: todayIso,
  scheduleReviews: scheduleReviews,
  learning: learningService,
});

function handle(req, res) {
  setSecurityHeaders(res);
  if (!setCors(req, res))
    return fail(res, 403, "CORS", "Origin is not allowed.");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  var found = router.match(req);
  if (!found) return fail(res, 404, "NOT_FOUND", "مسیر API پیدا نشد.");
  var needsBody = ["POST", "PUT", "PATCH"].indexOf(req.method) >= 0;
  function run(body) {
    var user = found.route.roles
      ? requireAuth(req, res, found.route.roles)
      : null;
    if (found.route.roles && !user) return;
    if (found.route.roles && !validCsrf(req, user))
      return fail(
        res,
        403,
        "CSRF",
        "درخواست امنیتی معتبر نیست. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
      );
    try {
      var result = found.route.handler(req, res, found.match, body || {}, user);
      if (result && typeof result.then === "function")
        result.catch(function (e) {
          console.error(e);
          if (!res.writableEnded)
            fail(
              res,
              500,
              "INTERNAL",
              "خطای داخلی سرور.",
              env.nodeEnv === "development" ? String(e.stack || e) : null,
            );
        });
    } catch (e) {
      console.error(e);
      if (!res.writableEnded)
        fail(
          res,
          500,
          "INTERNAL",
          "خطای داخلی سرور.",
          env.nodeEnv === "development" ? String(e.stack || e) : null,
        );
    }
  }
  if (needsBody)
    parseBody(req, function (err, body) {
      if (err) {
        if (!res.writableEnded)
          fail(
            res,
            err.message === "BODY_TOO_LARGE" ? 413 : 400,
            err.message,
            err.message === "INVALID_JSON"
              ? "JSON نامعتبر است."
              : "درخواست نامعتبر است.",
          );
        return;
      }
      run(body);
    });
  else run({});
}

cleanupSessions();
realtime.cleanup(
  db,
  new Date(Date.now() - env.eventRetentionHours * 3600000).toISOString(),
);
setInterval(function () {
  cleanupSessions();
  realtime.cleanup(
    db,
    new Date(Date.now() - env.eventRetentionHours * 3600000).toISOString(),
  );
}, 3600000).unref();
var server = http.createServer(handle);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.on("error", function (error) {
  if (error && error.code === "EADDRINUSE") {
    var probe=http.get({host:"127.0.0.1",port:env.port,path:"/ready",timeout:1500},function(res){var raw="";res.on("data",function(c){raw+=c;});res.on("end",function(){
      try { var payload=JSON.parse(raw); if(res.statusCode===200&&payload&&payload.data&&payload.data.version){console.log("Moshaver API is already running at http://localhost:"+env.port+" (version "+payload.data.version+").");db.close();return process.exit(0);} } catch(e) {}
      console.error("Port "+env.port+" is occupied by another application. Set PORT to a free port or stop that process.");db.close();process.exit(1);
    });});
    probe.on("error",function(){console.error("Port "+env.port+" is occupied. Set PORT to a free port or stop that process.");try{db.close();}catch(e){}process.exit(1);});return;
  }
  console.error("HTTP server error:",error&&error.stack?error.stack:error);try{db.close();}catch(e){}process.exit(1);
});
server.listen(env.port, "0.0.0.0", function () {
  const isProduction = env.nodeEnv === "production";
  const localUrl = `http://localhost:${env.port}`;

  console.log("");
  console.log("┌──────────────────────────────────────────────────────┐");
  console.log("│                                                      │");
  console.log("│   Moshaver | مشاور                                   │");
  console.log("│   API Server                                         │");
  console.log("│                                                      │");
  console.log("├──────────────────────────────────────────────────────┤");
  console.log(`│  Version      ${env.version}`);
  console.log(`│  Environment  ${env.nodeEnv}`);
  console.log(`│  Node.js      ${process.version}`);
  console.log(`│  PID          ${process.pid}`);
  console.log("├──────────────────────────────────────────────────────┤");
  console.log(`│  Local        ${localUrl}`);
  console.log(`│  Network      http://0.0.0.0:${env.port}`);
  console.log(`│  Database     ${env.databasePath}`);
  console.log("├──────────────────────────────────────────────────────┤");
  console.log(`│  Health       ${localUrl}/health`);
  console.log(`│  API Health   ${localUrl}/api/v1/health`);
  console.log("└──────────────────────────────────────────────────────┘");

  if (!isProduction) {
    console.log("");
    console.log("Development accounts");
    console.log("────────────────────────────────────────────────────────");
    console.log(`Admin    ${env.adminUsername}`);
    console.log(`Student  ${env.studentUsername}`);
    console.log("");
    console.log("Passwords are hidden from startup logs.");
  }

  console.log("");
  console.log("Moshaver | مشاور API started");
  console.log(`✓ Moshaver API is ready on port ${env.port}`);
  console.log("");
});

var shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("Received " + signal + "; shutting down gracefully...");
  realtime.closeAll();
  server.close(function () {
    try {
      db.close();
    } catch (e) {}
    console.log("HTTP server and SQLite closed.");
    process.exit(0);
  });
  setTimeout(function () {
    console.error("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", function () {
  shutdown("SIGTERM");
});
process.on("SIGINT", function () {
  shutdown("SIGINT");
});
process.on("uncaughtException", function (err) {
  console.error("Uncaught exception:", err && err.stack ? err.stack : err);
  shutdown("uncaughtException");
});
process.on("unhandledRejection", function (reason) {
  console.error("Unhandled rejection:", reason);
});
