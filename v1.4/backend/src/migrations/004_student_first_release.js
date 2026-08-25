"use strict";

function hasColumn(db, tableName, columnName) {
  return db.prepare("PRAGMA table_info(" + tableName + ")").all().some(function (row) { return row.name === columnName; });
}

function addColumn(db, tableName, columnName, definition) {
  if (!hasColumn(db, tableName, columnName)) db.exec("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
}

function up(db) {
  addColumn(db, "students", "account_status", "TEXT NOT NULL DEFAULT 'active'");
  addColumn(db, "students", "archived_at", "TEXT");
  addColumn(db, "students", "advisor_id", "TEXT");
  addColumn(db, "study_sessions", "paused_seconds", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "study_sessions", "paused_at", "TEXT");
  addColumn(db, "study_sessions", "tests_completed", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "study_sessions", "correct_count", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "study_sessions", "wrong_count", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "study_sessions", "focus_rating", "INTEGER");
  db.exec(`
CREATE TABLE IF NOT EXISTS learning_item_reviews (
  id TEXT PRIMARY KEY,
  learning_item_id TEXT NOT NULL REFERENCES learning_items(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  previous_mastery INTEGER NOT NULL,
  new_mastery INTEGER NOT NULL,
  previous_interval_days INTEGER NOT NULL,
  next_interval_days INTEGER NOT NULL,
  next_review_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learning_item_reviews_item ON learning_item_reviews(learning_item_id,reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_item_reviews_student ON learning_item_reviews(student_id,reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_status_created ON students(account_status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_submitted ON quiz_attempts(student_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_student_started ON study_sessions(student_id,started_at DESC);
`);
  db.prepare("UPDATE students SET account_status=CASE WHEN active=1 THEN 'active' ELSE 'inactive' END WHERE account_status IS NULL OR account_status='' OR (account_status='active' AND active=0)").run();
}

module.exports = { version: 4, name: "student_first_release", up: up };
