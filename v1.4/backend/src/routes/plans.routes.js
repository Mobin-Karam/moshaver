"use strict";

var createPlansService = require("../services/plans.service");

function registerPlansRoutes(router, deps) {
  var str = deps.str;
  var query = deps.query;
  var isoDateValid = deps.isoDateValid;
  var timeValid = deps.timeValid;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var notifyStudent = deps.notifyStudent;
  var emitStudent = deps.emitStudent;
  var plans = createPlansService(deps);

  router.add(
    "GET",
    /^\/api\/v1\/dashboard$/,
    ["student"],
    function (req, res, match, body, user) {
      var q = query(req);
      var date = isoDateValid(q.date)
        ? q.date
        : new Date().toISOString().slice(0, 10);
      var data = plans.dashboard(user.student_id, date);
      if (!data) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      ok(res, data);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/plans$/,
    ["student"],
    function (req, res, match, body, user) {
      var q = query(req);
      if (isoDateValid(q.date)) {
        return ok(res, plans.studentPlanForDate(user.student_id, q.date));
      }
      var from = isoDateValid(q.from) ? q.from : "0000-01-01";
      var to = isoDateValid(q.to) ? q.to : "9999-12-31";
      ok(res, plans.studentPlansInRange(user.student_id, from, to));
    },
  );

    router.add("GET", /^\/api\/v1\/admin\/plans$/, ["admin"], function (req, res) {
    var q = query(req),
      sid = str(q.studentId, 100),
      date = str(q.date, 10);
    if (!sid) return fail(res, 400, "VALIDATION", "studentId لازم است.");
    if (isoDateValid(date)) {
      return ok(res, plans.adminPlanForDate(sid, date));
    }
    var from = isoDateValid(q.from) ? q.from : "0000-01-01",
      to = isoDateValid(q.to) ? q.to : "9999-12-31";
    ok(res, plans.adminPlansInRange(sid, from, to));
  });

    router.add(
    "POST",
    /^\/api\/v1\/admin\/plans$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = str(body.studentId, 100),
        date = str(body.planDate, 10);
      if (!sid || !isoDateValid(date))
        return fail(res, 400, "VALIDATION", "دانش‌آموز و تاریخ معتبر لازم است.");
      var result = plans.saveAdminPlan(body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      if (result.data.created) {
        if (result.data.published)
          emitStudent(result.data.studentId, "plan.published", {
            planId: result.data.planId,
            planDate: result.data.planDate,
          });
      } else {
        emitStudent(result.data.studentId, "plan.updated", {
          planId: result.data.planId,
          planDate: result.data.planDate,
        });
      }
      audit(user, result.data.created ? "create" : "update", "plan", result.data.planId, body);
      ok(res, result.data.plan, result.data.created ? 201 : 200);
    },
  );

    router.add(
    "PATCH",
    /^\/api\/v1\/admin\/plans\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = plans.updateAdminPlan(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      if (result.data.published) {
        notifyStudent(
          result.data.studentId,
          "برنامه به‌روزرسانی شد",
          "برنامه " + result.data.planDate + " توسط مشاور منتشر شد.",
          { type: "lesson", url: "/schedule?date=" + encodeURIComponent(result.data.planDate) },
        );
        emitStudent(result.data.studentId, "plan.published", {
          planId: result.data.planId,
          planDate: result.data.planDate,
        });
      } else {
        emitStudent(result.data.studentId, "plan.updated", {
          planId: result.data.planId,
          planDate: result.data.planDate,
        });
      }
      audit(user, "update", "plan", result.data.planId, body);
      ok(res, result.data.plan);
    },
  );

    router.add(
    "DELETE",
    /^\/api\/v1\/admin\/plans\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = plans.deleteAdminPlan(match[1]);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "delete", "plan", result.data.planId, {});
      ok(res, { deleted: true });
    },
  );

    router.add(
    "POST",
    /^\/api\/v1\/admin\/plans\/([^/]+)\/duplicate$/,
    ["admin"],
    function (req, res, match, body, user) {
      var date = str(body.planDate, 10);
      if (!isoDateValid(date))
        return fail(res, 400, "VALIDATION", "تاریخ مقصد معتبر نیست.");
      var result = plans.duplicateAdminPlan(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "duplicate", "plan", result.data.planId, {
        sourceId: result.data.sourceId,
        date: date,
      });
      ok(res, result.data.plan, 201);
    },
  );

    router.add(
    "POST",
    /^\/api\/v1\/admin\/plans\/([^/]+)\/tasks$/,
    ["admin"],
    function (req, res, match, body, user) {
      if (!timeValid(body.start) || !timeValid(body.end) || body.end <= body.start)
        return fail(res, 400, "VALIDATION", "زمان شروع و پایان معتبر لازم است.");
      var result = plans.createAdminTask(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "create", "task", result.data.taskId, body);
      ok(res, result.data.plan, 201);
    },
  );

    router.add(
    "PATCH",
    /^\/api\/v1\/admin\/tasks\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = plans.updateAdminTask(match[1], body);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "update", "task", result.data.taskId, body);
      ok(res, result.data.plan);
    },
  );

    router.add(
    "DELETE",
    /^\/api\/v1\/admin\/tasks\/([^/]+)$/,
    ["admin"],
    function (req, res, match, body, user) {
      var result = plans.deleteAdminTask(match[1]);
      if (result.error)
        return fail(res, result.error.status, result.error.code, result.error.message);
      audit(user, "delete", "task", match[1], {});
      ok(res, { deleted: true });
    },
  );

    router.add(
    "POST",
    /^\/api\/v1\/admin\/plans\/publish-range$/,
    ["admin"],
    function (req, res, match, body, user) {
      var sid = str(body.studentId, 120),
        from = str(body.from, 10),
        to = str(body.to, 10);
      if (!sid || !isoDateValid(from) || !isoDateValid(to))
        return fail(res, 400, "VALIDATION", "studentId/from/to لازم است.");
      var published = body.published === false ? 0 : 1;
      var result = plans.publishAdminPlanRange(sid, from, to, published);
      if (published) {
        notifyStudent(
          sid,
          "برنامه منتشر شد",
          "برنامه جدید برای بازه " + from + " تا " + to + " آماده است.",
          { type: "lesson", url: "/schedule?date=" + encodeURIComponent(from) },
        );
        emitStudent(sid, "plan.published", {
          from: from,
          to: to,
          count: result.data.updated,
        });
      }
      audit(user, "publish_range", "plan", sid, {
        from: from,
        to: to,
        published: !!published,
        count: result.data.updated,
      });
      ok(res, result.data);
    },
  );
}

module.exports = registerPlansRoutes;
