"use strict";

function registerLearningRoutes(router, deps) {
  var query = deps.query;
  var str = deps.str;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var learning = deps.learning;
  var recordActivity = deps.recordActivity;
  var notifyStudent = deps.notifyStudent;
  var emitStudent = deps.emitStudent;

  function handleResult(res, result, status) {
    if (result.error) return fail(res, result.error.status, result.error.code, result.error.message);
    ok(res, result.data, result.status || status || 200);
  }

  router.add("GET", /^\/api\/v1\/learning\/summary$/, ["student"], function (req, res, match, body, user) {
    ok(res, learning.summary(user.student_id));
  });

  router.add("GET", /^\/api\/v1\/learning\/items$/, ["student"], function (req, res, match, body, user) {
    ok(res, learning.list(user.student_id, query(req)));
  });

  router.add("POST", /^\/api\/v1\/learning\/items$/, ["student"], function (req, res, match, body, user) {
    var result = learning.create(user.student_id, body);
    if (!result.error) recordActivity(user.student_id, "learning.created", "learning_item", result.data.id, { dueDate: result.data.dueDate });
    handleResult(res, result, 201);
  });

  router.add("PATCH", /^\/api\/v1\/learning\/items\/([^/]+)$/, ["student"], function (req, res, match, body, user) {
    handleResult(res, learning.update(user.student_id, match[1], body));
  });

  router.add("POST", /^\/api\/v1\/learning\/items\/([^/]+)\/review$/, ["student"], function (req, res, match, body, user) {
    var result = learning.complete(user.student_id, match[1], body);
    if (!result.error) recordActivity(user.student_id, "learning.reviewed", "learning_item", result.data.id, { mastery: result.data.mastery, nextDueDate: result.data.dueDate });
    handleResult(res, result);
  });

  router.add("GET", /^\/api\/v1\/learning\/items\/([^/]+)\/reviews$/, ["student"], function (req, res, match, body, user) {
    var rows = learning.reviewHistory(user.student_id, match[1], query(req).limit);
    if (!rows) return fail(res, 404, "NOT_FOUND", "مورد یادگیری پیدا نشد.");
    ok(res, rows);
  });

  router.add("DELETE", /^\/api\/v1\/learning\/items\/([^/]+)$/, ["student"], function (req, res, match, body, user) {
    handleResult(res, learning.remove(user.student_id, match[1]));
  });

  router.add("GET", /^\/api\/v1\/admin\/students\/([^/]+)\/learning$/, ["admin"], function (req, res, match) {
    ok(res, { summary: learning.summary(match[1]), items: learning.list(match[1], { limit: 120 }) });
  });

  router.add("GET", /^\/api\/v1\/admin\/students\/([^/]+)\/learning\/([^/]+)\/reviews$/, ["admin"], function (req, res, match) {
    var rows = learning.reviewHistory(match[1], match[2], query(req).limit);
    if (!rows) return fail(res, 404, "NOT_FOUND", "مورد یادگیری پیدا نشد.");
    ok(res, rows);
  });

  router.add("POST", /^\/api\/v1\/admin\/students\/([^/]+)\/learning$/, ["admin"], function (req, res, match, body, user) {
    var result = learning.create(match[1], body);
    if (!result.error) {
      audit(user, "create", "learning_item", result.data.id, { studentId: match[1], dueDate: result.data.dueDate });
      notifyStudent(match[1], "مرور جدید", result.data.title || "یک مورد جدید برای مرور ثبت شد");
      emitStudent(match[1], "learning.updated", { action: "created", itemId: result.data.id, dueDate: result.data.dueDate });
    }
    handleResult(res, result, 201);
  });

  router.add("PATCH", /^\/api\/v1\/admin\/students\/([^/]+)\/learning\/([^/]+)$/, ["admin"], function (req, res, match, body, user) {
    var result = learning.update(match[1], match[2], body);
    if (!result.error) {
      audit(user, "update", "learning_item", result.data.id, { studentId: match[1] });
      emitStudent(match[1], "learning.updated", { action: "updated", itemId: result.data.id, dueDate: result.data.dueDate });
    }
    handleResult(res, result);
  });

  router.add("DELETE", /^\/api\/v1\/admin\/students\/([^/]+)\/learning\/([^/]+)$/, ["admin"], function (req, res, match, body, user) {
    var result = learning.remove(match[1], match[2]);
    if (!result.error) {
      audit(user, "delete", "learning_item", match[2], { studentId: match[1] });
      emitStudent(match[1], "learning.updated", { action: "deleted", itemId: match[2] });
    }
    handleResult(res, result);
  });
}

module.exports = registerLearningRoutes;
