"use strict";

var migrations = [
  require("./001_initial_schema"),
  require("./002_future_roles"),
  require("./003_learning_journal"),
  require("./004_student_first_release"),
  require("./005_study_pause"),
  require("./006_group_chat"),
  require("./007_web_push"),
];

function appliedVersions(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  var rows = db
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all();
  var out = Object.create(null);
  rows.forEach(function (row) {
    out[Number(row.version)] = true;
  });
  return out;
}

function runMigrations(db, now) {
  var applied = appliedVersions(db);
  migrations.forEach(function (migration) {
    if (applied[migration.version]) return;
    if (migration.useTransaction === false) {
      migration.up(db);
      db.prepare(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      ).run(migration.version, now());
      return;
    }
    db.exec("BEGIN");
    try {
      migration.up(db);
      db.prepare(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      ).run(migration.version, now());
      db.exec("COMMIT");
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch (rollbackErr) {}
      throw err;
    }
  });
}

module.exports = {
  runMigrations: runMigrations,
};
