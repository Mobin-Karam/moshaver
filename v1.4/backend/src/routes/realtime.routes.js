"use strict";

function registerRealtimeRoutes(router, deps) {
  var db = deps.db;
  var realtime = deps.realtime;

  router.add(
    "GET",
    /^\/api\/v1\/events$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      realtime.stream(db, req, res, user);
    },
  );
}

module.exports = registerRealtimeRoutes;
