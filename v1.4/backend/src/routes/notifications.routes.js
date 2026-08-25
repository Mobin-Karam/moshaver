"use strict";

function registerNotificationsRoutes(router, deps) {
  var db = deps.db;
  var ok = deps.ok;

  router.add(
    "GET",
    /^\/api\/v1\/notifications$/,
    ["student"],
    function (req, res, match, body, user) {
      ok(
        res,
        db
          .prepare(
            "SELECT id,title,body,is_read AS isRead,created_at AS createdAt FROM notifications WHERE student_id=? ORDER BY created_at DESC LIMIT 50",
          )
          .all(user.student_id),
      );
    },
  );

  router.add(
    "PUT",
    /^\/api\/v1\/notifications\/([^/]+)\/read$/,
    ["student"],
    function (req, res, match, body, user) {
      db.prepare(
        "UPDATE notifications SET is_read=1 WHERE id=? AND student_id=?",
      ).run(match[1], user.student_id);
      ok(res, { id: match[1], isRead: true });
    },
  );

  router.add(
    "PUT",
    /^\/api\/v1\/notifications\/read-all$/,
    ["student"],
    function (req, res, match, body, user) {
      var r = db
        .prepare(
          "UPDATE notifications SET is_read=1 WHERE student_id=? AND is_read=0",
        )
        .run(user.student_id);
      ok(res, { updated: r.changes });
    },
  );
}

module.exports = registerNotificationsRoutes;
