"use strict";

function registerAdminRoutes(router, deps) {
  var db = deps.db;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var query = deps.query;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var todayIso = deps.todayIso;
  var mapPlan = deps.mapPlan;
  var getPresence = deps.getPresence;
  var activeStudySession = deps.activeStudySession;
  var mapActivityRows = deps.mapActivityRows;
  var getDueReviews = deps.getDueReviews;
  var getLearningSummary = deps.getLearningSummary;

  router.add(
    "GET",
    /^\/api\/v1\/admin\/dashboard$/,
    ["admin"],
    function (req, res, match, body, user) {
      var students = db
        .prepare("SELECT COUNT(*) AS n FROM students WHERE active=1")
        .get().n;
      var today = new Date().toISOString().slice(0, 10);
      var plans = db
        .prepare(
          "SELECT COUNT(*) AS n FROM plans WHERE plan_date=? AND published=1",
        )
        .get(today).n;
      var reports = db
        .prepare("SELECT COUNT(*) AS n FROM daily_reports WHERE plan_date=?")
        .get(today).n;
      var upcoming = db
        .prepare("SELECT COUNT(*) AS n FROM exams WHERE iso_date>=?")
        .get(today).n;
      var recoveries = db
        .prepare(
          "SELECT COUNT(*) AS n FROM recovery_requests WHERE status='pending'",
        )
        .get().n;
      var recent = db
        .prepare(
          `SELECT dr.*,s.name AS student_name FROM daily_reports dr JOIN students s ON s.id=dr.student_id ORDER BY dr.updated_at DESC LIMIT 8`,
        )
        .all();
      var unreadChat = db
        .prepare(
          `SELECT COUNT(*) AS n FROM chat_messages cm LEFT JOIN chat_reads cr ON cr.conversation_id=cm.conversation_id AND cr.user_id=? WHERE cm.sender_role='student' AND cm.deleted_at IS NULL AND cm.created_at>COALESCE(cr.last_read_at,'0000-01-01T00:00:00.000Z')`,
        )
        .get(user.id).n;
      var missed = db
        .prepare(
          `SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id
    WHERE p.plan_date=? AND p.published=1 AND tc.id IS NULL AND t.end_time<?`,
        )
        .get(today, new Date().toTimeString().slice(0, 5)).n;
      ok(res, {
        students: students,
        todayPlans: plans,
        todayReports: reports,
        upcomingExams: upcoming,
        pendingRecoveries: recoveries,
        missedTasks: missed,
        unreadChat: unreadChat,
        recentReports: recent,
      });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/live$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120);
      if (!sid) {
        var first = db
          .prepare(
            "SELECT id FROM students WHERE active=1 ORDER BY created_at LIMIT 1",
          )
          .get();
        sid = first ? first.id : "";
      }
      if (!sid) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      var student = db
        .prepare("SELECT id,name,grade,major FROM students WHERE id=?")
        .get(sid);
      if (!student) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      var plan = db
        .prepare("SELECT * FROM plans WHERE student_id=? AND plan_date=? LIMIT 1")
        .get(sid, todayIso());
      var activities = db
        .prepare(
          "SELECT * FROM activity_events WHERE student_id=? ORDER BY created_at DESC LIMIT 50",
        )
        .all(sid);
      var presence = getPresence(sid);
      var session = activeStudySession(sid);
      var currentTask = presence.activeTaskId
        ? db.prepare(`SELECT t.id,t.subject,t.title,t.type,t.start_time AS start,t.end_time AS end,t.pages,t.test_count AS testCount,p.plan_date AS planDate
            FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=? AND p.student_id=?`).get(presence.activeTaskId, sid)
        : null;
      var planProgress = db.prepare(`SELECT COUNT(t.id) AS total,
          SUM(CASE WHEN tc.status='done' THEN 1 ELSE 0 END) AS done,
          SUM(CASE WHEN tc.status='partial' THEN 1 ELSE 0 END) AS partial,
          SUM(CASE WHEN tc.status='skipped' THEN 1 ELSE 0 END) AS skipped
        FROM tasks t JOIN plans p ON p.id=t.plan_id
        LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=?
        WHERE p.student_id=? AND p.plan_date=?`).get(sid, sid, todayIso());
      var studyToday = db.prepare(`SELECT COALESCE(SUM(actual_minutes),0) AS minutes,COUNT(*) AS sessions
        FROM study_sessions WHERE student_id=? AND status='finished' AND substr(started_at,1,10)=?`).get(sid, todayIso());
      var lastAttempt = db.prepare(`SELECT a.id,a.percent,a.correct,a.wrong,a.blank,a.submitted_at AS submittedAt,q.title,q.subject,q.exam_id AS examId
        FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE a.student_id=? ORDER BY a.submitted_at DESC LIMIT 1`).get(sid) || null;
      var issues = db
        .prepare(
          "SELECT ti.*,t.subject,t.title FROM task_issues ti LEFT JOIN tasks t ON t.id=ti.task_id WHERE ti.student_id=? AND ti.status='open' ORDER BY ti.created_at DESC",
        )
        .all(sid);
      ok(res, {
        student: student,
        presence: presence,
        activeSession: session,
        currentTask: currentTask,
        todayPlan: mapPlan(plan, sid),
        planProgress: {
          total: Number(planProgress.total || 0),
          done: Number(planProgress.done || 0),
          partial: Number(planProgress.partial || 0),
          skipped: Number(planProgress.skipped || 0),
        },
        todayStudy: { minutes: Number(studyToday.minutes || 0), sessions: Number(studyToday.sessions || 0) },
        lastAttempt: lastAttempt,
        learning: getLearningSummary ? getLearningSummary(sid) : null,
        issues: issues,
        activity: mapActivityRows(activities),
        dueReviews: getDueReviews(sid, 20),
      });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/activity$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120),
        limit = Math.min(300, Math.max(1, num(q.limit, 100)));
      if (!sid) return fail(res, 400, "VALIDATION", "studentId لازم است.");
      ok(
        res,
        mapActivityRows(
          db
            .prepare(
              "SELECT * FROM activity_events WHERE student_id=? ORDER BY created_at DESC LIMIT ?",
            )
            .all(sid, limit),
        ),
      );
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/advisor-inbox$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120);
      if (!sid) return fail(res, 400, "VALIDATION", "studentId لازم است.");
      var issues = db
        .prepare(
          `SELECT ti.*,t.subject,t.title FROM task_issues ti LEFT JOIN tasks t ON t.id=ti.task_id WHERE ti.student_id=? AND ti.status='open' ORDER BY ti.created_at DESC`,
        )
        .all(sid);
      var recovery = db
        .prepare(
          "SELECT * FROM recovery_requests WHERE student_id=? AND status='pending' ORDER BY created_at DESC",
        )
        .all(sid);
      var reviews = getDueReviews(sid, 30);
      var missed = db
        .prepare(
          `SELECT t.id,t.subject,t.title,p.plan_date AS planDate,t.start_time AS start,t.end_time AS end FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=? WHERE p.student_id=? AND p.plan_date<? AND p.published=1 AND tc.id IS NULL ORDER BY p.plan_date DESC LIMIT 30`,
        )
        .all(sid, sid, todayIso());
      var examRetryRequests = db
        .prepare(
          `SELECT r.*,e.title AS examTitle FROM exam_attempt_requests r JOIN exams e ON e.id=r.exam_id WHERE r.student_id=? AND r.status='pending' ORDER BY r.created_at DESC`,
        )
        .all(sid);
      ok(res, {
        issues: issues,
        recoveryRequests: recovery,
        reviews: reviews,
        missedTasks: missed,
        examRetryRequests: examRetryRequests,
      });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/app-versions$/,
    ["admin"],
    function (req, res) {
      ok(res, db.prepare("SELECT * FROM app_versions ORDER BY app_name").all());
    },
  );

  router.add(
    "PUT",
    /^\/api\/v1\/admin\/app-versions\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var version = str(body.version, 80);
      if (!version) return fail(res, 400, "VALIDATION", "نسخه لازم است.");
      db.prepare(
        `INSERT INTO app_versions (app_name,version,updated_at) VALUES (?,?,?) ON CONFLICT(app_name) DO UPDATE SET version=excluded.version,updated_at=excluded.updated_at`,
      ).run(match[1], version, now());
      audit(user, "update", "app_version", match[1], { version: version });
      ok(res, { app: match[1], version: version });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/app-releases$/,
    ["admin"],
    function (req, res) {
      ok(
        res,
        db
          .prepare("SELECT * FROM app_releases ORDER BY updated_at DESC LIMIT 50")
          .all(),
      );
    },
  );

  router.add(
    "PUT",
    /^\/api\/v1\/admin\/app-releases\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var version = str(body.version, 80),
        notes = str(body.notes, 2000);
      if (!version) return fail(res, 400, "VALIDATION", "نسخه لازم است.");
      var t = now();
      db.prepare(
        `INSERT INTO app_releases (app_name,version,notes,updated_at) VALUES (?,?,?,?) ON CONFLICT(app_name,version) DO UPDATE SET notes=excluded.notes,updated_at=excluded.updated_at`,
      ).run(match[1], version, notes, t);
      db.prepare(
        `INSERT INTO app_versions (app_name,version,updated_at) VALUES (?,?,?) ON CONFLICT(app_name) DO UPDATE SET version=excluded.version,updated_at=excluded.updated_at`,
      ).run(match[1], version, t);
      audit(user, "release", "app", match[1], { version: version });
      ok(res, { app: match[1], version: version, notes: notes });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/audit$/,
    ["admin"],
    function (req, res) {
      ok(
        res,
        db
          .prepare(
            `SELECT a.*,u.display_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100`,
          )
          .all(),
      );
    },
  );
}

module.exports = registerAdminRoutes;
