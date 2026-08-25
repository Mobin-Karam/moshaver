"use strict";

module.exports = {
  version: 8,
  up: function (db) {
    db.exec(`
      CREATE TABLE notifications_v8 (
        id TEXT PRIMARY KEY,
        student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'announcement',
        url TEXT,
        data_json TEXT
      );
      INSERT INTO notifications_v8(id,student_id,user_id,title,body,is_read,created_at,type,url,data_json)
      SELECT n.id,n.student_id,
        (SELECT id FROM users WHERE users.student_id=n.student_id AND users.role='student' LIMIT 1),
        n.title,n.body,n.is_read,n.created_at,n.type,n.url,n.data_json
      FROM notifications n;
      DROP TABLE notifications;
      ALTER TABLE notifications_v8 RENAME TO notifications;
      CREATE INDEX IF NOT EXISTS idx_notifications_student_created
        ON notifications(student_id,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created
        ON notifications(user_id,created_at DESC,id DESC);
    `);
  },
};
