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

  router.add("POST", /^\/api\/v1\/admin\/system\/database-restore$/, ["admin"], function (req, res, match, body, user) {
    if (!bucketAllow("database-restore:" + user.id, 1, 300000)) return fail(res, 429, "RATE_LIMIT", "برای بازیابی بعدی کمی صبر کنید.");
    var contentType = String(req.headers["content-type"] || "").toLowerCase();
    if (contentType && ["application/vnd.sqlite3", "application/x-sqlite3", "application/octet-stream"].indexOf(contentType.split(";")[0]) < 0) {
      return fail(res, 415, "UNSUPPORTED_MEDIA_TYPE", "فقط فایل SQLite پشتیبان قابل بارگذاری است.");
    }
    if (!Buffer.isBuffer(body) || body.length < 4096) return fail(res, 400, "INVALID_BACKUP", "فایل پشتیبان معتبر نیست.");
    audit(user, "database.restore.requested", "database", "sqlite", { sizeBytes: body.length });
    var result;
    try {
      result = backup.restore(body);
    } catch (error) {
      try { audit(user, "database.restore.failed", "database", "sqlite", { success: false, message: error.message }); } catch (auditError) {}
      return fail(res, 400, "RESTORE_FAILED", "بازیابی پشتیبان انجام نشد.", env.nodeEnv === "development" ? error.message : null);
    }
    ok(res, result);
    setTimeout(function () {
      process.exit(0);
    }, 300);
  });
}

module.exports = registerSystemAdminRoutes;
