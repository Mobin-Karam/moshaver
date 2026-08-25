"use strict";

function registerRecoveryRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var isoDateValid = deps.isoDateValid;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var notifyStudent = deps.notifyStudent;
  var recordActivity = deps.recordActivity;

  router.add(
    "POST",
    /^\/api\/v1\/recovery-requests$/,
    ["student"],
    function (req, res, match, body, user) {
      var date = isoDateValid(body.planDate)
          ? body.planDate
          : new Date().toISOString().slice(0, 10),
        t = now(),
        rid = security.id("recovery");
      db.prepare(
        "INSERT INTO recovery_requests (id,student_id,plan_date,reason,note,status,created_at,updated_at) VALUES (?,?,?,?,?,'pending',?,?)",
      ).run(
        rid,
        user.student_id,
        date,
        str(body.reason, 200),
        str(body.note, 1500),
        t,
        t,
      );
      notifyStudent(
        user.student_id,
        "درخواست ریکاوری ثبت شد",
        "مشاور درخواست به‌هم‌خوردن برنامه را بررسی می‌کند.",
      );
      recordActivity(user.student_id, "recovery.requested", "plan", date, {
        recoveryId: rid,
        reason: str(body.reason, 200),
      });
      ok(res, { id: rid, status: "pending" }, 201);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/recovery-requests$/,
    ["admin"],
    function (req, res) {
      ok(
        res,
        db
          .prepare(
            `SELECT rr.*,s.name AS student_name FROM recovery_requests rr JOIN students s ON s.id=rr.student_id ORDER BY CASE rr.status WHEN 'pending' THEN 0 ELSE 1 END,rr.created_at DESC LIMIT 100`,
          )
          .all(),
      );
    },
  );

  router.add(
    "PATCH",
    /^\/api\/v1\/admin\/recovery-requests\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var rr = db
        .prepare("SELECT * FROM recovery_requests WHERE id=?")
        .get(match[1]);
      if (!rr) return fail(res, 404, "NOT_FOUND", "درخواست پیدا نشد.");
      var status =
        ["pending", "resolved", "dismissed"].indexOf(body.status) >= 0
          ? body.status
          : "resolved";
      db.prepare(
        "UPDATE recovery_requests SET status=?,updated_at=? WHERE id=?",
      ).run(status, now(), rr.id);
      if (status === "resolved")
        notifyStudent(
          rr.student_id,
          "برنامه ریکاوری بررسی شد",
          str(body.message, 1000) || "مشاور درخواستت را بررسی کرد؛ برنامه جدید را ببین.",
          { type: "announcement", url: "/schedule" },
        );
      audit(user, "update", "recovery_request", rr.id, { status: status });
      ok(res, { id: rr.id, status: status });
    },
  );
}

module.exports = registerRecoveryRoutes;
