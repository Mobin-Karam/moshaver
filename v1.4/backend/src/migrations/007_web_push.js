"use strict";

function ensureColumn(db, table, column, type) {
  var columns = db.prepare("PRAGMA table_info(" + table + ")").all();
  if (!columns.some(function (item) { return item.name === column; })) db.exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + type);
}

module.exports = {
  version: 7,
  up: function (db) {
    ensureColumn(db, "notifications", "type", "TEXT NOT NULL DEFAULT 'announcement'");
    ensureColumn(db, "notifications", "url", "TEXT");
    ensureColumn(db, "notifications", "data_json", "TEXT");
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_student_created ON notifications(student_id,created_at DESC,id DESC);
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_success_at TEXT,
        failure_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id,updated_at DESC);
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        lessons INTEGER NOT NULL DEFAULT 1,
        messages INTEGER NOT NULL DEFAULT 1,
        exams INTEGER NOT NULL DEFAULT 1,
        announcements INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );
    `);
  },
};
