"use strict";

var fs = require("fs");
var os = require("os");
var path = require("path");
var crypto = require("crypto");
var DatabaseSync = require("node:sqlite").DatabaseSync;

function createDatabaseBackupService(deps) {
  var db = deps.db;
  var env = deps.env;
  var now = deps.now;
  var tempRoot = path.join(os.tmpdir(), "moshaver-backups");

  function ensureTempRoot() {
    fs.mkdirSync(tempRoot, { recursive: true, mode: 448 });
  }

  function safeTimestamp(value) {
    return String(value).replace(/[-:]/g, "").replace("T", "-").replace(/\..*$/, "");
  }

  function create() {
    ensureTempRoot();
    var createdAt = now();
    var token = crypto.randomBytes(8).toString("hex");
    var tempPath = path.join(tempRoot, "snapshot-" + token + ".sqlite");
    var escaped = tempPath.replace(/'/g, "''");
    try {
      db.exec("VACUUM INTO '" + escaped + "'");
      var checkDb = new DatabaseSync(tempPath, { readOnly: true });
      try {
        var integrity = checkDb.prepare("PRAGMA quick_check").get();
        if (!integrity || integrity.quick_check !== "ok") throw new Error("Backup integrity check failed");
        var required = ["students", "users", "plans", "audit_logs"];
        var tables = checkDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(function (row) { return row.name; });
        required.forEach(function (name) { if (tables.indexOf(name) < 0) throw new Error("Backup missing required table: " + name); });
      } finally {
        checkDb.close();
      }
      var size = fs.statSync(tempPath).size;
      return { path: tempPath, filename: "moshaver-backup-" + safeTimestamp(createdAt) + ".sqlite", createdAt: createdAt, sizeBytes: size };
    } catch (error) {
      try { fs.unlinkSync(tempPath); } catch (cleanupError) {}
      throw error;
    }
  }

  function validateSnapshot(filePath) {
    var checkDb = new DatabaseSync(filePath, { readOnly: true });
    try {
      var integrity = checkDb.prepare("PRAGMA quick_check").get();
      if (!integrity || integrity.quick_check !== "ok") throw new Error("Backup integrity check failed");
      var required = ["students", "users", "plans", "audit_logs"];
      var tables = checkDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(function (row) { return row.name; });
      required.forEach(function (name) { if (tables.indexOf(name) < 0) throw new Error("Backup missing required table: " + name); });
      var counts = {};
      required.forEach(function (name) { counts[name] = Number(checkDb.prepare("SELECT COUNT(*) AS n FROM " + name).get().n || 0); });
      return { tables: tables.length, counts: counts };
    } finally {
      checkDb.close();
    }
  }

  function restore(buffer) {
    ensureTempRoot();
    if (!Buffer.isBuffer(buffer) || buffer.length < 4096) throw new Error("Uploaded backup is empty or too small");
    var token = crypto.randomBytes(8).toString("hex");
    var uploadPath = path.join(tempRoot, "restore-" + token + ".sqlite");
    var beforePath = path.join(tempRoot, "snapshot-before-restore-" + token + ".sqlite");
    var restoredAt = now();
    fs.writeFileSync(uploadPath, buffer, { mode: 384 });
    try {
      var inspected = validateSnapshot(uploadPath);
      db.exec("VACUUM INTO '" + beforePath.replace(/'/g, "''") + "'");
      var beforeSize = fs.statSync(beforePath).size;
      var replacePath = env.databasePath + ".restore-next";
      try {
        fs.copyFileSync(uploadPath, replacePath);
        fs.renameSync(replacePath, env.databasePath);
      }
      finally {
        try { fs.unlinkSync(replacePath); } catch (replaceCleanupError) { if (replaceCleanupError.code !== "ENOENT") throw replaceCleanupError; }
        try { fs.unlinkSync(env.databasePath + "-wal"); } catch (walError) { if (walError.code !== "ENOENT") throw walError; }
        try { fs.unlinkSync(env.databasePath + "-shm"); } catch (shmError) { if (shmError.code !== "ENOENT") throw shmError; }
      }
      return { restoredAt: restoredAt, sizeBytes: buffer.length, tables: inspected.tables, counts: inspected.counts, rollbackFilename: path.basename(beforePath), rollbackSizeBytes: beforeSize, requiresRestart: true };
    } catch (error) {
      try { fs.unlinkSync(uploadPath); } catch (cleanupError) {}
      throw error;
    } finally {
      try { fs.unlinkSync(uploadPath); } catch (cleanupUploadError) {}
    }
  }

  function cleanup(filePath) {
    if (!filePath || path.dirname(filePath) !== tempRoot) return;
    try { fs.unlinkSync(filePath); } catch (error) { if (error.code !== "ENOENT") console.error("backup cleanup failed:", error.message); }
  }

  function cleanupStale(maxAgeMs) {
    ensureTempRoot();
    var cutoff = Date.now() - Number(maxAgeMs || 3600000);
    fs.readdirSync(tempRoot).forEach(function (name) {
      if (!/^snapshot-[a-f0-9]+\.sqlite$/.test(name)) return;
      var file = path.join(tempRoot, name);
      try { if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file); } catch (error) {}
    });
  }

  function metadata() {
    var healthy = false;
    try { healthy = db.prepare("PRAGMA quick_check").get().quick_check === "ok"; } catch (error) {}
    var stat = fs.statSync(env.databasePath);
    var last = db.prepare("SELECT created_at,details_json FROM audit_logs WHERE action='database.backup.created' ORDER BY created_at DESC LIMIT 1").get();
    return { engine: "sqlite", status: healthy ? "healthy" : "error", sizeBytes: stat.size, lastBackupAt: last ? last.created_at : null };
  }

  return { create: create, cleanup: cleanup, cleanupStale: cleanupStale, metadata: metadata, restore: restore, validateSnapshot: validateSnapshot };
}

module.exports = createDatabaseBackupService;
