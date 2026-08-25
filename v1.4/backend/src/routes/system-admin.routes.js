"use strict";

var fs = require("fs");

function registerSystemAdminRoutes(router, deps) {
  var db = deps.db, env = deps.env, now = deps.now, ok = deps.ok, fail = deps.fail;
  var audit = deps.audit, bucketAllow = deps.bucketAllow, backup = deps.backup;

  router.add("GET", /^\/api\/v1\/admin\/system\/database$/, ["admin"], function (req, res) {
    var meta = backup.metadata();
    meta.version = env.version;
    meta.environment = env.nodeEnv;
    meta.uptimeSeconds = Math.floor(process.uptime());
    meta.activeSessions = Number(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE expires_at>?").get(now()).n || 0);
    meta.realtimeConnections = deps.realtime.count();
    ok(res, meta);
  });

  router.add("POST", /^\/api\/v1\/admin\/system\/database-backup$/, ["admin"], function (req, res, match, body, user) {
    if (!bucketAllow("database-backup:" + user.id, 2, 60000)) return fail(res, 429, "RATE_LIMIT", "برای تهیه پشتیبان بعدی کمی صبر کنید.");
    backup.cleanupStale(3600000);
    var snapshot;
    try { snapshot = backup.create(); }
    catch (error) {
      audit(user, "database.backup.failed", "database", "sqlite", { success: false });
      return fail(res, 500, "BACKUP_FAILED", "تهیه نسخه پشتیبان انجام نشد.");
    }
    audit(user, "database.backup.created", "database", "sqlite", { success: true, sizeBytes: snapshot.sizeBytes });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/vnd.sqlite3");
    res.setHeader("Content-Disposition", 'attachment; filename="' + snapshot.filename + '"');
    res.setHeader("Content-Length", String(snapshot.sizeBytes));
    res.setHeader("Cache-Control", "no-store");
    var cleaned = false;
    function cleanup() { if (cleaned) return; cleaned = true; backup.cleanup(snapshot.path); }
    var stream = fs.createReadStream(snapshot.path);
    stream.on("error", function () { cleanup(); if (!res.writableEnded) res.destroy(); });
    res.on("finish", cleanup);
    res.on("close", cleanup);
    stream.pipe(res);
  });
}

module.exports = registerSystemAdminRoutes;
