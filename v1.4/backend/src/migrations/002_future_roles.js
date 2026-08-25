"use strict";

var ROLE_CHECK = "('admin','advisor','teacher','student','guardian')";

function tableSql(db, tableName) {
  var row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  return row && row.sql ? String(row.sql) : "";
}

function rebuildUsersIfNeeded(db) {
  if (tableSql(db, "users").indexOf("'guardian'") >= 0) return;
  db.exec(`
CREATE TABLE users_next (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ${ROLE_CHECK}),
  display_name TEXT NOT NULL,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO users_next (id,username,password_hash,role,display_name,student_id,is_active,created_at,updated_at)
  SELECT id,username,password_hash,role,display_name,student_id,is_active,created_at,updated_at FROM users;
DROP TABLE users;
ALTER TABLE users_next RENAME TO users;
`);
}

function rebuildChatMessagesIfNeeded(db) {
  if (tableSql(db, "chat_messages").indexOf("'guardian'") >= 0) return;
  db.exec(`
CREATE TABLE chat_messages_next (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK(sender_role IN ${ROLE_CHECK}),
  message_text TEXT NOT NULL,
  reply_to_id TEXT REFERENCES chat_messages_next(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  deleted_at TEXT
);
INSERT INTO chat_messages_next (id,conversation_id,sender_user_id,sender_role,message_text,reply_to_id,created_at,edited_at,deleted_at)
  SELECT id,conversation_id,sender_user_id,sender_role,message_text,reply_to_id,created_at,edited_at,deleted_at FROM chat_messages;
DROP TABLE chat_messages;
ALTER TABLE chat_messages_next RENAME TO chat_messages;
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON chat_messages(conversation_id,created_at,id);
`);
}

function rebuildRealtimeEventsIfNeeded(db) {
  if (tableSql(db, "realtime_events").indexOf("'guardian'") >= 0) return;
  db.exec(`
CREATE TABLE realtime_events_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audience_role TEXT NOT NULL CHECK(audience_role IN ('admin','advisor','teacher','student','guardian','all')),
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO realtime_events_next (id,audience_role,student_id,event_type,payload_json,created_at)
  SELECT id,audience_role,student_id,event_type,payload_json,created_at FROM realtime_events;
DROP TABLE realtime_events;
ALTER TABLE realtime_events_next RENAME TO realtime_events;
CREATE INDEX IF NOT EXISTS idx_realtime_events_audience ON realtime_events(audience_role,student_id,id);
`);
}

function up(db) {
  db.exec("PRAGMA foreign_keys=OFF");
  db.exec("BEGIN");
  try {
    rebuildUsersIfNeeded(db);
    rebuildChatMessagesIfNeeded(db);
    rebuildRealtimeEventsIfNeeded(db);
    db.exec(`
CREATE TABLE IF NOT EXISTS advisor_students (
  advisor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(advisor_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_advisor_students_student ON advisor_students(student_id, advisor_id);

CREATE TABLE IF NOT EXISTS teacher_students (
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(teacher_id, student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON teacher_students(student_id, teacher_id);

CREATE TABLE IF NOT EXISTS student_guardians (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'other' CHECK(relationship IN ('parent','mother','father','sibling','other')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(student_id, guardian_id)
);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON student_guardians(guardian_id, student_id);
`);
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch (rollbackErr) {}
    throw err;
  } finally {
    db.exec("PRAGMA foreign_keys=ON");
  }
  var violations = db.prepare("PRAGMA foreign_key_check").all();
  if (violations.length) {
    throw new Error("Foreign key check failed after future role migration");
  }
}

module.exports = {
  version: 2,
  name: "future_roles",
  useTransaction: false,
  up: up,
};
