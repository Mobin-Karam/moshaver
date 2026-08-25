"use strict";

function registerStudyRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var ok = deps.ok;
  var fail = deps.fail;
  var touchPresence = deps.touchPresence;
  var recordActivity = deps.recordActivity;
  var activeStudySession = deps.activeStudySession;

  router.add(
    "GET",
    /^\/api\/v1\/study-sessions\/active$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(res, activeStudySession(user.student_id));
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/study-sessions\/([^/]+)\/pause$/,
    ["student"],
    function (req, res, match, body, user) {
      var ss = db.prepare("SELECT * FROM study_sessions WHERE id=? AND student_id=? AND status='active'").get(match[1], user.student_id);
      if (!ss) return fail(res, 404, "NOT_FOUND", "جلسه فعال پیدا نشد.");
      if (ss.paused_at) return ok(res, { id: ss.id, paused: true });
      var pausedAt = now();
      db.prepare("UPDATE study_sessions SET paused_at=?,updated_at=? WHERE id=?").run(pausedAt, pausedAt, ss.id);
      recordActivity(user.student_id, "study.paused", "task", ss.task_id, { sessionId: ss.id });
      ok(res, { id: ss.id, paused: true });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/study-sessions\/([^/]+)\/resume$/,
    ["student"],
    function (req, res, match, body, user) {
      var ss = db.prepare("SELECT * FROM study_sessions WHERE id=? AND student_id=? AND status='active'").get(match[1], user.student_id);
      if (!ss) return fail(res, 404, "NOT_FOUND", "جلسه فعال پیدا نشد.");
      if (!ss.paused_at) return ok(res, { id: ss.id, paused: false });
      var extra = ss.paused_at ? Math.max(0, Math.round((new Date(now()) - new Date(ss.paused_at)) / 1000)) : 0;
      db.prepare("UPDATE study_sessions SET paused_seconds=paused_seconds+?,paused_at=NULL,updated_at=? WHERE id=?").run(extra, now(), ss.id);
      recordActivity(user.student_id, "study.resumed", "task", ss.task_id, { sessionId: ss.id });
      ok(res, { id: ss.id, paused: false });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/study-sessions\/start$/,
    ["student"],
    function (req, res, match, body, user) {
      var taskId = str(body.taskId, 120) || null;
      if (taskId) {
        var task = db
          .prepare(
            `SELECT t.id,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?`,
          )
          .get(taskId);
        if (!task || task.student_id !== user.student_id)
          return fail(res, 404, "NOT_FOUND", "فعالیت پیدا نشد.");
      }
      var old = activeStudySession(user.student_id);
      if (old) {
        if ((old.taskId || null) === (taskId || null)) return ok(res, old);
        return fail(
          res,
          409,
          "ACTIVE_STUDY_SESSION",
          "یک جلسه مطالعه دیگر هنوز فعال است. ابتدا همان جلسه را تمام کنید.",
          { activeSession: old },
        );
      }
      var id = security.id("study"),
        t = now();
      db.prepare(
        `INSERT INTO study_sessions (id,student_id,task_id,started_at,ended_at,status,actual_minutes,last_heartbeat_at,note,created_at,updated_at) VALUES (?,?,?,?,NULL,'active',0,?,?,?,?)`,
      ).run(id, user.student_id, taskId, t, t, str(body.note, 500), t, t);
      touchPresence(
        user.student_id,
        "studying",
        taskId,
        id,
        str(body.deviceLabel, 120),
      );
      recordActivity(user.student_id, "study.started", "task", taskId, {
        sessionId: id,
      });
      ok(res, activeStudySession(user.student_id), 201);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/study-sessions\/([^/]+)\/heartbeat$/,
    ["student"],
    function (req, res, match, body, user) {
      var ss = db
        .prepare(
          "SELECT * FROM study_sessions WHERE id=? AND student_id=? AND status='active'",
        )
        .get(match[1], user.student_id);
      if (!ss) return fail(res, 404, "NOT_FOUND", "جلسه فعال پیدا نشد.");
      db.prepare(
        "UPDATE study_sessions SET last_heartbeat_at=?,updated_at=? WHERE id=?",
      ).run(now(), now(), ss.id);
      touchPresence(
        user.student_id,
        "studying",
        ss.task_id,
        ss.id,
        str(body.deviceLabel, 120),
      );
      ok(res, { id: ss.id, alive: true });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/study-sessions\/([^/]+)\/finish$/,
    ["student"],
    function (req, res, match, body, user) {
      var ss = db
        .prepare(
          "SELECT * FROM study_sessions WHERE id=? AND student_id=? AND status='active'",
        )
        .get(match[1], user.student_id);
      if (!ss) return fail(res, 404, "NOT_FOUND", "جلسه فعال پیدا نشد.");
      var end = now(),
        pausedSeconds = Number(ss.paused_seconds || 0) + (ss.paused_at ? Math.max(0, Math.round((new Date(end) - new Date(ss.paused_at)) / 1000)) : 0),
        minutes = Math.max(
          0,
          Math.round(((new Date(end) - new Date(ss.started_at)) / 1000 - pausedSeconds) / 60),
        );
      var testsCompleted = Math.min(100000, Math.max(0, Math.floor(num(body.testsCompleted, 0)))),
        correct = Math.min(testsCompleted, Math.max(0, Math.floor(num(body.correct, 0)))),
        wrong = Math.min(testsCompleted - correct, Math.max(0, Math.floor(num(body.wrong, 0)))),
        focusRating = body.focusRating == null ? null : Math.min(5, Math.max(1, Math.floor(num(body.focusRating, 1))));
      db.prepare(
        "UPDATE study_sessions SET ended_at=?,status='finished',actual_minutes=?,paused_seconds=?,paused_at=NULL,last_heartbeat_at=?,note=?,tests_completed=?,correct_count=?,wrong_count=?,focus_rating=?,updated_at=? WHERE id=?",
      ).run(end, minutes, pausedSeconds, end, str(body.note, 500) || ss.note, testsCompleted, correct, wrong, focusRating, end, ss.id);
      touchPresence(user.student_id, "online", null, null, str(body.deviceLabel, 120));
      recordActivity(user.student_id, "study.finished", "task", ss.task_id, {
        sessionId: ss.id,
        actualMinutes: minutes, testsCompleted: testsCompleted,
      });
      ok(res, { id: ss.id, actualMinutes: minutes, testsCompleted: testsCompleted, correct: correct, wrong: wrong, focusRating: focusRating, endedAt: end });
    },
  );
}

module.exports = registerStudyRoutes;
