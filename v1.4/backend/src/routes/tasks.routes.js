"use strict";

function registerTasksRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var query = deps.query;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var recordActivity = deps.recordActivity;
  var notifyStudent = deps.notifyStudent;
  var emitStudent = deps.emitStudent;

  router.add(
    "PUT",
    /^\/api\/v1\/tasks\/([^/]+)\/completion$/,
    ["student"],
    function (req, res, match, body, user) {
      var taskId = match[1];
      var task = db
        .prepare(
          `SELECT t.id,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?`,
        )
        .get(taskId);
      if (!task || task.student_id !== user.student_id)
        return fail(res, 404, "NOT_FOUND", "فعالیت پیدا نشد.");
      var status =
        ["done", "partial", "skipped"].indexOf(body.status) >= 0
          ? body.status
          : "done";
      var id = security.id("completion");
      db.prepare(
        `INSERT INTO task_completions (id,task_id,student_id,status,actual_minutes,actual_tests,note,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(task_id,student_id) DO UPDATE SET status=excluded.status,actual_minutes=excluded.actual_minutes,actual_tests=excluded.actual_tests,note=excluded.note,updated_at=excluded.updated_at`,
      ).run(
        id,
        taskId,
        user.student_id,
        status,
        Math.max(0, num(body.actualMinutes, 0)),
        Math.max(0, num(body.actualTests, 0)),
        str(body.note, 1000),
        now(),
      );
      recordActivity(user.student_id, "task." + status, "task", taskId, {
        actualMinutes: Math.max(0, num(body.actualMinutes, 0)),
        actualTests: Math.max(0, num(body.actualTests, 0)),
      });
      ok(res, {
        taskId: taskId,
        status: status,
        actualMinutes: Math.max(0, num(body.actualMinutes, 0)),
        actualTests: Math.max(0, num(body.actualTests, 0)),
      });
    },
  );

  router.add(
    "DELETE",
    /^\/api\/v1\/tasks\/([^/]+)\/completion$/,
    ["student"],
    function (req, res, match, body, user) {
      db.prepare(
        "DELETE FROM task_completions WHERE task_id=? AND student_id=?",
      ).run(match[1], user.student_id);
      ok(res, { taskId: match[1], cleared: true });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/task-issues$/,
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
      var id = security.id("issue"),
        t = now();
      db.prepare(
        "INSERT INTO task_issues (id,student_id,task_id,issue_type,note,status,advisor_note,created_at,updated_at) VALUES (?,?,?,?,?,'open','',?,?)",
      ).run(
        id,
        user.student_id,
        taskId,
        str(body.issueType, 100) || "other",
        str(body.note, 1200),
        t,
        t,
      );
      recordActivity(user.student_id, "issue.created", "task", taskId, {
        issueType: str(body.issueType, 100),
      });
      ok(res, { id: id, status: "open" }, 201);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/task-issues$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(
        res,
        db
          .prepare(
            `SELECT id,task_id AS taskId,issue_type AS issueType,note,status,advisor_note AS advisorNote,created_at AS createdAt,updated_at AS updatedAt FROM task_issues WHERE student_id=? ORDER BY created_at DESC LIMIT 100`,
          )
          .all(user.student_id),
      );
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/tasks\/([^/]+)\/comments$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(
        res,
        db
          .prepare(
            `SELECT id,body,created_at AS createdAt FROM advisor_comments WHERE student_id=? AND task_id=? AND visible_to_student=1 ORDER BY created_at`,
          )
          .all(user.student_id, match[1]),
      );
    },
  );

  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/task-issues\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var issue = db
        .prepare("SELECT * FROM task_issues WHERE id=?")
        .get(match[1]);
      if (!issue) return fail(res, 404, "NOT_FOUND", "گزارش مشکل پیدا نشد.");
      var status =
        ["open", "resolved", "dismissed"].indexOf(body.status) >= 0
          ? body.status
          : issue.status;
      db.prepare(
        "UPDATE task_issues SET status=?,advisor_note=?,updated_at=? WHERE id=?",
      ).run(status, str(body.advisorNote, 1500), now(), issue.id);
      if (str(body.advisorNote, 1500))
        notifyStudent(
          issue.student_id,
          "پاسخ مشاور",
          str(body.advisorNote, 1000),
          { type: "message", url: "/schedule" },
        );
      audit(user, "update", "task_issue", issue.id, { status: status });
      ok(res, { id: issue.id, status: status });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/admin\/comments$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = str(body.studentId, 120),
        text = str(body.body, 2000),
        taskId = str(body.taskId, 120) || null;
      if (!sid || !text)
        return fail(res, 400, "VALIDATION", "studentId و متن لازم است.");
      var id = security.id("comment");
      db.prepare(
        "INSERT INTO advisor_comments (id,student_id,task_id,body,visible_to_student,created_by,created_at) VALUES (?,?,?,?,?,?,?)",
      ).run(
        id,
        sid,
        taskId,
        text,
        body.visibleToStudent === false ? 0 : 1,
        user.id,
        now(),
      );
      if (body.visibleToStudent !== false) {
        notifyStudent(sid, "پیام مشاور", text, { type: "message", url: taskId ? "/schedule?task=" + encodeURIComponent(taskId) : "/messages" });
        emitStudent(sid, "advisor.comment.created", {
          id: id,
          taskId: taskId,
          body: text,
          createdAt: now(),
        });
      }
      audit(user, "create", "advisor_comment", id, {
        studentId: sid,
        taskId: taskId,
      });
      ok(res, { id: id }, 201);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/comments$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120);
      if (!sid) return fail(res, 400, "VALIDATION", "studentId لازم است.");
      var sql = "SELECT * FROM advisor_comments WHERE student_id=?",
        args = [sid];
      if (q.taskId) {
        sql += " AND task_id=?";
        args.push(str(q.taskId, 120));
      }
      sql += " ORDER BY created_at DESC LIMIT 100";
      var st = db.prepare(sql);
      ok(res, st.all.apply(st, args));
    },
  );
}

module.exports = registerTasksRoutes;
