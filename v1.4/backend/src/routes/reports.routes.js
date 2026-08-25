"use strict";

function registerReportsRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var query = deps.query;
  var isoDateValid = deps.isoDateValid;
  var ok = deps.ok;
  var fail = deps.fail;
  var recordActivity = deps.recordActivity;
  var objectiveDailyMetrics = deps.objectiveDailyMetrics;
  var getReport = deps.getReport;

  router.add(
    "POST",
    /^\/api\/v1\/reports$/,
    ["student"],
    function (req, res, match, body, user) {
      var date = str(body.planDate, 10);
      if (!isoDateValid(date))
        return fail(res, 400, "VALIDATION", "تاریخ گزارش معتبر نیست.");
      var t = now(),
        m = objectiveDailyMetrics(user.student_id, date),
        focus = Math.min(10, Math.max(0, num(body.focus, 0))),
        fatigue = Math.min(10, Math.max(0, num(body.fatigue, 0))),
        motivation = Math.min(10, Math.max(0, num(body.motivation, 0)));
      db.prepare(
        `INSERT INTO daily_reports (id,student_id,plan_date,study_hours,tests,correct,wrong,blank,focus,fatigue,motivation,problem,tomorrow,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(student_id,plan_date) DO UPDATE SET study_hours=excluded.study_hours,tests=excluded.tests,correct=excluded.correct,wrong=excluded.wrong,blank=excluded.blank,focus=excluded.focus,fatigue=excluded.fatigue,motivation=excluded.motivation,problem=excluded.problem,tomorrow=excluded.tomorrow,updated_at=excluded.updated_at`,
      ).run(
        security.id("report"),
        user.student_id,
        date,
        m.studyHours,
        m.tests,
        m.correct,
        m.wrong,
        m.blank,
        focus,
        fatigue,
        motivation,
        str(body.problem, 2000),
        str(body.tomorrow, 2000),
        t,
        t,
      );
      recordActivity(user.student_id, "report.submitted", "report", date, {
        studyMinutes: m.studyMinutes,
        tests: m.tests,
        focus: focus,
        fatigue: fatigue,
        motivation: motivation,
      });
      ok(
        res,
        Object.assign({}, getReport(user.student_id, date), {
          serverMetrics: m,
        }),
        201,
      );
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/reports$/,
    ["student"],
    function (req, res, match, body, user) {
      var q = query(req);
      var from = isoDateValid(q.from) ? q.from : "0000-01-01";
      var to = isoDateValid(q.to) ? q.to : "9999-12-31";
      ok(
        res,
        db
          .prepare(
            "SELECT * FROM daily_reports WHERE student_id=? AND plan_date BETWEEN ? AND ? ORDER BY plan_date DESC",
          )
          .all(user.student_id, from, to),
      );
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/reports$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 100),
        from = isoDateValid(q.from) ? q.from : "0000-01-01",
        to = isoDateValid(q.to) ? q.to : "9999-12-31";
      var sql = `SELECT dr.*,s.name AS student_name FROM daily_reports dr JOIN students s ON s.id=dr.student_id WHERE dr.plan_date BETWEEN ? AND ?`;
      var args = [from, to];
      if (sid) {
        sql += " AND dr.student_id=?";
        args.push(sid);
      }
      sql += " ORDER BY dr.plan_date DESC,dr.updated_at DESC LIMIT 200";
      ok(res, db.prepare(sql).all.apply(db.prepare(sql), args));
    },
  );
}

module.exports = registerReportsRoutes;
