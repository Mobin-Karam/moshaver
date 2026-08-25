"use strict";

function hasColumn(db, tableName, columnName) {
  return db.prepare("PRAGMA table_info(" + tableName + ")").all().some(function (row) {
    return row.name === columnName;
  });
}

function addColumn(db, tableName, columnName, definition) {
  if (!hasColumn(db, tableName, columnName)) {
    db.exec("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
  }
}

function up(db) {
  addColumn(db, "quiz_questions", "book", "TEXT");
  addColumn(db, "quiz_questions", "chapter", "TEXT");
  addColumn(db, "quiz_questions", "lesson", "TEXT");
  addColumn(db, "quiz_questions", "topic", "TEXT");
  addColumn(db, "quiz_questions", "hint", "TEXT");

  db.exec(`
CREATE TABLE IF NOT EXISTS learning_items (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source_answer_id TEXT REFERENCES quiz_answers(id) ON DELETE SET NULL,
  subject TEXT,
  book TEXT,
  chapter TEXT,
  lesson TEXT,
  topic TEXT,
  title TEXT NOT NULL,
  note TEXT,
  hint TEXT,
  due_date TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  review_count INTEGER NOT NULL DEFAULT 0,
  mastery INTEGER NOT NULL DEFAULT 0 CHECK(mastery BETWEEN 0 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','archived')),
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_items_answer ON learning_items(student_id,source_answer_id) WHERE source_answer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_items_due ON learning_items(student_id,status,due_date);
CREATE INDEX IF NOT EXISTS idx_learning_items_subject ON learning_items(student_id,subject,status);
`);
}

module.exports = {
  version: 3,
  name: "learning_journal",
  up: up,
};
