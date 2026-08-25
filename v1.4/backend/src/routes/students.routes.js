"use strict";

function registerStudentsRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var boolInt = deps.boolInt;
  var query = deps.query;
  var num = deps.num;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var getSubjects = deps.getSubjects;
  var mapPlan = deps.mapPlan;
  var getPlanMetrics = deps.getPlanMetrics;
  var getExamProgress = deps.getExamProgress;

  router.add(
    "GET",
    /^\/api\/v1\/admin\/students\/([^/]+)\/overview$/,
    ["admin"],
    function (req, res, match) {
      var sid = match[1],
        student = db.prepare(`SELECT s.*,u.id AS user_id,u.username,u.is_active AS account_active FROM students s LEFT JOIN users u ON u.student_id=s.id AND u.role='student' WHERE s.id=?`).get(sid);
      if (!student) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      var today = new Date().toISOString().slice(0, 10),
        p = db
          .prepare("SELECT * FROM plans WHERE student_id=? AND plan_date=?")
          .get(sid, today),
        next = db
          .prepare(
            "SELECT id FROM exams WHERE (student_id=? OR student_id IS NULL) AND iso_date>=? AND published=1 ORDER BY iso_date LIMIT 1",
          )
          .get(sid, today);
      ok(res, {
        student: student,
        subjects: getSubjects(sid),
        todayPlan: mapPlan(p, sid),
        todayMetrics: getPlanMetrics(mapPlan(p, sid)),
        nextExam: next ? getExamProgress(sid, next.id) : null,
        recentReports: db
          .prepare(
            "SELECT * FROM daily_reports WHERE student_id=? ORDER BY plan_date DESC LIMIT 7",
          )
          .all(sid),
        mistakeCount: db
          .prepare(
            `SELECT COUNT(*) AS n FROM quiz_answers qa JOIN quiz_attempts att ON att.id=qa.attempt_id WHERE att.student_id=? AND qa.is_correct=0`,
          )
          .get(sid).n,
      });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/students$/,
    ["admin"],
    function (req, res) {
      var q = query(req), search = str(q.search, 120), status = str(q.status, 30),
        limit = Math.min(100, Math.max(1, num(q.limit, 30))), offset = Math.max(0, num(q.offset, 0));
      var where = [], args = [];
      if (search) { where.push("(s.name LIKE ? OR u.username LIKE ?)"); args.push("%" + search + "%", "%" + search + "%"); }
      if (["active", "inactive", "archived"].indexOf(status) >= 0) { where.push("s.account_status=?"); args.push(status); }
      else where.push("s.account_status<>'archived'");
      var clause = " WHERE " + where.join(" AND ");
      var total = db.prepare(`SELECT COUNT(*) AS n FROM students s LEFT JOIN users u ON u.student_id=s.id AND u.role='student'${clause}`).get(...args).n;
      var rows = db.prepare(
            `SELECT s.*,u.username,u.is_active AS account_active,
              (SELECT MAX(se.last_seen_at) FROM sessions se WHERE se.user_id=u.id) AS last_seen_at,
              (SELECT sp.last_seen_at FROM student_presence sp WHERE sp.student_id=s.id) AS presence_last_seen_at,
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.student_id=s.id) AS attempt_count,
              (SELECT ROUND(AVG(qa.percent),1) FROM quiz_attempts qa WHERE qa.student_id=s.id) AS average_percent,
              (SELECT COUNT(*) FROM learning_items li WHERE li.student_id=s.id AND li.status='pending' AND li.due_date<=date('now')) AS due_learning_count,
              (SELECT COALESCE(SUM(ss.actual_minutes),0) FROM study_sessions ss WHERE ss.student_id=s.id AND ss.status='finished' AND substr(ss.started_at,1,10)=date('now')) AS today_study_minutes
             FROM students s LEFT JOIN users u ON u.student_id=s.id AND u.role='student'${clause}
             ORDER BY CASE s.account_status WHEN 'active' THEN 0 WHEN 'inactive' THEN 1 ELSE 2 END,s.name LIMIT ? OFFSET ?`,
          ).all(...args.concat([limit, offset]));
      ok(res, { items: rows, total: Number(total || 0), limit: limit, offset: offset, hasMore: offset + rows.length < Number(total || 0) });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/admin\/students$/,
    ["admin"],
    function (req, res, match, body, user) {
      var name = str(body.name, 120),
        username = str(body.username, 100),
        password = str(body.password, 300);
      if (!name || !username || !password)
        return fail(
          res,
          400,
          "VALIDATION",
          "نام، نام کاربری و رمز عبور لازم است.",
        );
      if (db.prepare("SELECT id FROM users WHERE username=?").get(username))
        return fail(res, 409, "DUPLICATE", "نام کاربری قبلاً استفاده شده است.");
      var sid = security.id("student"),
        uid = security.id("user"),
        t = now();
      db.exec("BEGIN");
      try {
        db.prepare(
          "INSERT INTO students (id,name,grade,major,target_major,target_city,rank_goal,daily_capacity,active,account_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,? ,?,?,?)",
        ).run(
          sid,
          name,
          str(body.grade, 100) || "دوازدهم انسانی",
          str(body.major, 100) || "انسانی",
          str(body.targetMajor, 120),
          str(body.targetCity, 120),
          str(body.rankGoal, 120),
          str(body.dailyCapacity, 120),
          body.active === false ? 0 : 1,
          body.active === false ? "inactive" : "active",
          t,
          t,
        );
        db.prepare(
          "INSERT INTO users (id,username,password_hash,role,display_name,student_id,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ).run(
          uid,
          username,
          security.hashPasswordSync(password),
          "student",
          name,
          sid,
          body.active === false ? 0 : 1,
          t,
          t,
        );
        var subjects = db.prepare("SELECT id FROM subjects").all();
        var ins = db.prepare(
          "INSERT OR IGNORE INTO student_subjects (student_id,subject_id,status,progress,mastery,note) VALUES (?,?,?,?,?,?)",
        );
        subjects.forEach(function (s) {
          ins.run(sid, s.id, "yellow", 0, "", "");
        });
        db.exec("COMMIT");
        audit(user, "create", "student", sid, {
          name: name,
          username: username,
        });
        ok(res, { id: sid, name: name, username: username }, 201);
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  );

  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/students\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = match[1],
        existing = db.prepare("SELECT * FROM students WHERE id=?").get(sid);
      if (!existing) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      var map = {
        name: "name",
        grade: "grade",
        major: "major",
        targetMajor: "target_major",
        targetCity: "target_city",
        rankGoal: "rank_goal",
        dailyCapacity: "daily_capacity",
        active: "active",
      };
      Object.keys(map).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(body, k)) {
          var col = map[k],
            val = col === "active" ? boolInt(body[k]) : str(body[k], 200);
          db.prepare(
            "UPDATE students SET " + col + "=?,updated_at=? WHERE id=?",
          ).run(val, now(), sid);
        }
      });
      if (body.name)
        db.prepare(
          `UPDATE users SET display_name=?,updated_at=? WHERE student_id=? AND role='student'`,
        ).run(str(body.name, 120), now(), sid);
      if (Object.prototype.hasOwnProperty.call(body, "username")) {
        var username = str(body.username, 100);
        if (!username) return fail(res, 400, "VALIDATION", "نام کاربری نمی‌تواند خالی باشد.");
        var duplicate = db.prepare("SELECT id FROM users WHERE username=? AND NOT (student_id=? AND role='student')").get(username, sid);
        if (duplicate) return fail(res, 409, "DUPLICATE", "نام کاربری قبلاً استفاده شده است.");
        db.prepare(`UPDATE users SET username=?,updated_at=? WHERE student_id=? AND role='student'`).run(username, now(), sid);
      }
      if (Object.prototype.hasOwnProperty.call(body, "active")) {
        db.prepare(`UPDATE users SET is_active=?,updated_at=? WHERE student_id=? AND role='student'`).run(boolInt(body.active), now(), sid);
        if (!boolInt(body.active)) {
          db.prepare(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=? AND role='student')`).run(sid);
        }
        db.prepare("UPDATE students SET account_status=?,archived_at=NULL WHERE id=?").run(boolInt(body.active) ? "active" : "inactive", sid);
      }
      audit(user, "update", "student", sid, body);
      ok(res, db.prepare(`SELECT s.*,u.username,u.is_active AS account_active FROM students s LEFT JOIN users u ON u.student_id=s.id AND u.role='student' WHERE s.id=?`).get(sid));
    },
  );

  router.add(
    "DELETE",
    /^\/api\/v1\/admin\/students\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = match[1];
      if (!db.prepare("SELECT id FROM students WHERE id=?").get(sid))
        return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      var t = now();
      db.exec("BEGIN");
      try {
        db.prepare("UPDATE students SET active=0,account_status='archived',archived_at=?,updated_at=? WHERE id=?").run(t, t, sid);
        db.prepare(`UPDATE users SET is_active=0,updated_at=? WHERE student_id=? AND role='student'`).run(t, sid);
        db.prepare(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=? AND role='student')`).run(sid);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      audit(user, "archive", "student", sid, {});
      ok(res, { id: sid, active: false, archived: true, deleted: false });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/admin\/students\/([^/]+)\/activate$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = match[1], t = now();
      if (!db.prepare("SELECT id FROM students WHERE id=?").get(sid))
        return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      db.prepare("UPDATE students SET active=1,account_status='active',archived_at=NULL,updated_at=? WHERE id=?").run(t, sid);
      db.prepare(`UPDATE users SET is_active=1,updated_at=? WHERE student_id=? AND role='student'`).run(t, sid);
      audit(user, "activate", "student", sid, {});
      ok(res, { id: sid, active: true });
    },
  );

  router.add("POST", /^\/api\/v1\/admin\/students\/([^/]+)\/restore$/, ["admin"], function (req, res, match, body, user) {
    var sid=match[1],t=now(),row=db.prepare("SELECT id,account_status FROM students WHERE id=?").get(sid);
    if(!row)return fail(res,404,"NOT_FOUND","دانش‌آموز پیدا نشد.");
    if(row.account_status!=="archived")return fail(res,409,"NOT_ARCHIVED","این حساب بایگانی نشده است.");
    db.prepare("UPDATE students SET active=1,account_status='active',archived_at=NULL,updated_at=? WHERE id=?").run(t,sid);
    db.prepare("UPDATE users SET is_active=1,updated_at=? WHERE student_id=? AND role='student'").run(t,sid);
    audit(user,"restore","student",sid,{}); ok(res,{id:sid,active:true,restored:true,accountStatus:"active"});
  });

  router.add("POST", /^\/api\/v1\/admin\/students\/([^/]+)\/deactivate$/, ["admin"], function (req, res, match, body, user) {
    var sid = match[1], t = now();
    if (!db.prepare("SELECT id FROM students WHERE id=? AND account_status<>'archived'").get(sid)) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
    db.prepare("UPDATE students SET active=0,account_status='inactive',archived_at=NULL,updated_at=? WHERE id=?").run(t, sid);
    db.prepare("UPDATE users SET is_active=0,updated_at=? WHERE student_id=? AND role='student'").run(t, sid);
    db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=? AND role='student')").run(sid);
    audit(user, "deactivate", "student", sid, {}); ok(res, { id: sid, active: false, accountStatus: "inactive" });
  });

  router.add("POST", /^\/api\/v1\/admin\/students\/([^/]+)\/force-logout$/, ["admin"], function (req, res, match, body, user) {
    var r = db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=? AND role='student')").run(match[1]);
    audit(user, "force_logout", "student", match[1], {}); ok(res, { revokedSessions: Number(r.changes || 0) });
  });

  router.add(
    "POST",
    /^\/api\/v1\/admin\/students\/([^/]+)\/reset-password$/,
    ["admin"],
    function (req, res, match, body, user) {
      var password = str(body.password, 300);
      if (password.length < 8)
        return fail(
          res,
          400,
          "VALIDATION",
          "رمز عبور باید حداقل ۸ کاراکتر باشد.",
        );
      var r = db
        .prepare(
          `UPDATE users SET password_hash=?,updated_at=? WHERE student_id=? AND role='student'`,
        )
        .run(security.hashPasswordSync(password), now(), match[1]);
      if (!r.changes)
        return fail(res, 404, "NOT_FOUND", "حساب دانش‌آموز پیدا نشد.");
      db.prepare(
        `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=? AND role='student')`,
      ).run(match[1]);
      audit(user, "reset_password", "student", match[1], {});
      ok(res, { reset: true });
    },
  );
}

module.exports = registerStudentsRoutes;
