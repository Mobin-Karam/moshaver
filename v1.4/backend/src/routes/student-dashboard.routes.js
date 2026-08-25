"use strict";

function registerStudentDashboardRoutes(router, deps) {
  var ok = deps.ok, fail = deps.fail, query = deps.query, dashboard = deps.dashboard;
  router.add("GET", /^\/api\/v1\/student\/today$/, ["student"], function (req, res, match, body, user) {
    var data = dashboard.today(user.student_id);
    if (!data) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
    ok(res, data);
  });
  router.add("GET", /^\/api\/v1\/student\/progress\/weekly$/, ["student"], function (req, res, match, body, user) { ok(res, dashboard.weekly(user.student_id)); });
  router.add("GET", /^\/api\/v1\/student\/performance\/topics$/, ["student"], function (req, res, match, body, user) { ok(res, dashboard.topicPerformance(user.student_id, query(req).limit)); });
  router.add("GET", /^\/api\/v1\/admin\/attention$/, ["admin"], function (req, res) { ok(res, dashboard.attention(query(req))); });
  router.add("GET", /^\/api\/v1\/admin\/realtime\/students$/, ["admin"], function (req, res) { ok(res, dashboard.realtimeSnapshot(query(req))); });
  router.add("GET", /^\/api\/v1\/admin\/students\/([^/]+)\/progress\/weekly$/, ["admin"], function (req, res, match) { ok(res, dashboard.weekly(match[1])); });
  router.add("GET", /^\/api\/v1\/admin\/students\/([^/]+)\/performance\/topics$/, ["admin"], function (req, res, match) { ok(res, dashboard.topicPerformance(match[1], query(req).limit)); });
}

module.exports = registerStudentDashboardRoutes;
