"use strict";

function registerSubjectsRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var getSubjects = deps.getSubjects;

  router.add(
    "GET",
    /^\/api\/v1\/subjects$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(res, getSubjects(user.student_id));
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/subjects$/,
    ["admin"],
    function (req, res) {
      ok(
        res,
        db.prepare("SELECT * FROM subjects ORDER BY display_order").all(),
      );
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/admin\/subjects$/,
    ["admin"],
    function (req, res, match, body, user) {
      var name = str(body.name, 150),
        key = str(body.subjectKey, 80);
      if (!name || !key)
        return fail(res, 400, "VALIDATION", "نام و کلید درس لازم است.");
      var id = security.id("subject"),
        t = now();
      try {
        db.prepare(
          "INSERT INTO subjects (id,subject_key,name,display_order,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        ).run(id, key, name, num(body.displayOrder, 99), t, t);
      } catch (e) {
        return fail(res, 409, "DUPLICATE", "کلید درس تکراری است.");
      }
      db.prepare(
        "INSERT OR IGNORE INTO student_subjects (student_id,subject_id,status,progress,mastery,note) SELECT id,?,'yellow',0,'','' FROM students",
      ).run(id);
      audit(user, "create", "subject", id, body);
      ok(res, { id: id, name: name, subjectKey: key }, 201);
    },
  );

  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/subjects\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var s = db.prepare("SELECT * FROM subjects WHERE id=?").get(match[1]);
      if (!s) return fail(res, 404, "NOT_FOUND", "درس پیدا نشد.");
      if (body.name)
        db.prepare("UPDATE subjects SET name=?,updated_at=? WHERE id=?").run(
          str(body.name, 150),
          now(),
          s.id,
        );
      if (Object.prototype.hasOwnProperty.call(body, "displayOrder"))
        db.prepare(
          "UPDATE subjects SET display_order=?,updated_at=? WHERE id=?",
        ).run(num(body.displayOrder, 0), now(), s.id);
      audit(user, "update", "subject", s.id, body);
      ok(res, db.prepare("SELECT * FROM subjects WHERE id=?").get(s.id));
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/student-subjects\/([^/]+)$/,
    ["admin"],
    function (req, res, match) {
      ok(res, getSubjects(match[1]));
    },
  );

  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/student-subjects\/([^/]+)\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = match[1],
        subid = match[2];
      if (
        !db.prepare("SELECT 1 FROM students WHERE id=?").get(sid) ||
        !db.prepare("SELECT 1 FROM subjects WHERE id=?").get(subid)
      )
        return fail(res, 404, "NOT_FOUND", "دانش‌آموز یا درس پیدا نشد.");
      db.prepare(
        `INSERT INTO student_subjects (student_id,subject_id,status,progress,mastery,note) VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,subject_id) DO UPDATE SET status=excluded.status,progress=excluded.progress,mastery=excluded.mastery,note=excluded.note`,
      ).run(
        sid,
        subid,
        str(body.status, 20) || "yellow",
        Math.min(100, Math.max(0, num(body.progress, 0))),
        str(body.mastery, 100),
        str(body.note, 1000),
      );
      audit(user, "update", "student_subject", sid + ":" + subid, body);
      ok(res, getSubjects(sid));
    },
  );
}

module.exports = registerSubjectsRoutes;
