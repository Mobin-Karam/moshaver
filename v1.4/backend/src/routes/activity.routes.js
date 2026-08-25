"use strict";

function registerActivityRoutes(router, deps) {
  var str = deps.str;
  var ok = deps.ok;
  var fail = deps.fail;
  var bucketAllow = deps.bucketAllow;
  var touchPresence = deps.touchPresence;
  var recordActivity = deps.recordActivity;

  router.add(
    "POST",
    /^\/api\/v1\/presence$/,
    ["student"],
    function (req, res, match, body, user) {
      if (!bucketAllow("presence:" + user.id, 4, 60000))
        return fail(
          res,
          429,
          "RATE_LIMITED",
          "به‌روزرسانی وضعیت بیش از حد است.",
        );
      var state =
        ["online", "studying", "quiz", "idle"].indexOf(body.state) >= 0
          ? body.state
          : "online";
      var p = touchPresence(
        user.student_id,
        state,
        str(body.taskId, 120) || null,
        str(body.sessionId, 120) || null,
        str(body.deviceLabel, 120),
      );
      ok(res, p);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/activity$/,
    ["student"],
    function (req, res, match, body, user) {
      if (!bucketAllow("activity:" + user.id, 40, 60000))
        return fail(
          res,
          429,
          "RATE_LIMITED",
          "رویدادهای زیادی ارسال شده است.",
        );
      var allowed = {
        "task.opened": 1,
        "task.done": 1,
        "task.partial": 1,
        "task.skipped": 1,
        "study.started": 1,
        "study.finished": 1,
        "quiz.started": 1,
        "quiz.completed": 1,
        "quiz.cancelled": 1,
        "report.submitted": 1,
        "recovery.requested": 1,
        "issue.created": 1,
        "review.done": 1,
        "review.skipped": 1,
        "exam.retry_requested": 1,
        "learning.created": 1,
        "learning.reviewed": 1,
        "attempt.reviewed": 1,
        "screen.viewed": 1,
      };
      var eventType = str(body.eventType, 80);
      if (!allowed[eventType])
        return fail(res, 400, "EVENT_TYPE", "نوع رویداد معتبر نیست.");
      var meta =
        body.metadata && typeof body.metadata === "object" ? body.metadata : {};
      if (JSON.stringify(meta).length > 4096)
        return fail(
          res,
          413,
          "METADATA_TOO_LARGE",
          "اطلاعات رویداد بیش از حد بزرگ است.",
        );
      recordActivity(
        user.student_id,
        eventType,
        str(body.entityType, 80),
        str(body.entityId, 120),
        meta,
      );
      touchPresence(
        user.student_id,
        str(body.state, 30) || "online",
        str(body.taskId, 120) || null,
        str(body.sessionId, 120) || null,
        str(body.deviceLabel, 120),
      );
      ok(res, { recorded: true }, 201);
    },
  );
}

module.exports = registerActivityRoutes;
