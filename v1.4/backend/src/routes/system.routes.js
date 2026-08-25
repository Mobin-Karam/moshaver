"use strict";

function registerSystemRoutes(router, deps) {
  var env = deps.env;
  var db = deps.db;
  var now = deps.now;
  var ok = deps.ok;

  function healthPayload() {
    var check = db.prepare("SELECT 1 AS ok").get();
    return {
      status: check.ok === 1 ? "ok" : "error",
      database: check.ok === 1 ? "connected" : "error",
      version: env.version,
      time: now(),
    };
  }

  router.add("GET", /^\/$/, null, function (req, res) {
    ok(res, {
      name: env.appName + " API",
      version: env.version,
      status: "ok",
      health: "/health",
      apiHealth: "/api/v1/health",
    });
  });

  router.add("GET", /^\/health$/, null, function (req, res) {
    ok(res, healthPayload());
  });

  router.add("GET", /^\/ready$/, null, function (req, res) {
    ok(res, healthPayload());
  });

  router.add("GET", /^\/api\/v1\/health$/, null, function (req, res) {
    ok(res, healthPayload());
  });

  router.add("GET", /^\/api\/v1\/ready$/, null, function (req, res) {
    ok(res, healthPayload());
  });

  router.add(
    "GET",
    /^\/api\/v1\/public\/app-version\/([^/]+)$/,
    null,
    function (req, res, match) {
      var row = db
        .prepare("SELECT * FROM app_versions WHERE app_name=?")
        .get(match[1]);
      var rel = row
        ? db
            .prepare(
              "SELECT notes FROM app_releases WHERE app_name=? AND version=?",
            )
            .get(row.app_name, row.version)
        : null;
      ok(
        res,
        row
          ? {
              app: row.app_name,
              version: row.version,
              notes: rel ? rel.notes : "",
              updatedAt: row.updated_at,
            }
          : { app: match[1], version: env.version, notes: "", updatedAt: null },
      );
    },
  );
}

module.exports = registerSystemRoutes;
