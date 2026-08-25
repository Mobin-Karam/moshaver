"use strict";

function registerReviewsRoutes(router, deps) {
  var db = deps.db;
  var now = deps.now;
  var str = deps.str;
  var query = deps.query;
  var ok = deps.ok;
  var fail = deps.fail;
  var recordActivity = deps.recordActivity;
  var getDueReviews = deps.getDueReviews;

  router.add(
    "GET",
    /^\/api\/v1\/reviews$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(res, getDueReviews(user.student_id, 50));
    },
  );

  router.add(
    "PATCH",
    /^\/api\/v1\/reviews\/([^/]+)$/,
    ["student"],
    function (req, res, match, body, user) {
      var status =
        ["done", "skipped"].indexOf(body.status) >= 0 ? body.status : "done";
      var r = db
        .prepare("SELECT * FROM review_items WHERE id=? AND student_id=?")
        .get(match[1], user.student_id);
      if (!r) return fail(res, 404, "NOT_FOUND", "مرور پیدا نشد.");
      db.prepare(
        "UPDATE review_items SET status=?,completed_at=? WHERE id=?",
      ).run(status, now(), r.id);
      recordActivity(
        user.student_id,
        "review." + status,
        "syllabus",
        r.syllabus_id,
        { reviewId: r.id },
      );
      ok(res, { id: r.id, status: status });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/reviews$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120);
      if (!sid) return fail(res, 400, "VALIDATION", "studentId لازم است.");
      ok(res, getDueReviews(sid, 100));
    },
  );
}

module.exports = registerReviewsRoutes;
