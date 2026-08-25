"use strict";

function up(db) {
  var has = db.prepare("PRAGMA table_info(study_sessions)").all().some(function (row) { return row.name === "paused_at"; });
  if (!has) db.exec("ALTER TABLE study_sessions ADD COLUMN paused_at TEXT");
}

module.exports = { version: 5, name: "study_pause", up: up };
