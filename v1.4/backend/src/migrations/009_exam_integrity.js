"use strict";

function columns(db, table) {
  var out = Object.create(null);
  db.prepare("PRAGMA table_info(" + table + ")").all().forEach(function (row) { out[row.name] = true; });
  return out;
}

function add(db, table, name, type) {
  if (!columns(db, table)[name]) db.exec("ALTER TABLE " + table + " ADD COLUMN " + name + " " + type);
}

module.exports = {
  version: 9,
  up: function (db) {
    add(db, "quiz_attempts", "run_id", "TEXT");
    ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation", "book", "chapter", "lesson", "topic", "hint"].forEach(function (name) { add(db, "quiz_answers", name, "TEXT"); });
    add(db, "quiz_answers", "sort_order", "INTEGER");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempts_run_id ON quiz_attempts(run_id) WHERE run_id IS NOT NULL");
    db.exec("UPDATE quiz_answers SET question_text=(SELECT question_text FROM quiz_questions WHERE id=question_id),option_a=(SELECT option_a FROM quiz_questions WHERE id=question_id),option_b=(SELECT option_b FROM quiz_questions WHERE id=question_id),option_c=(SELECT option_c FROM quiz_questions WHERE id=question_id),option_d=(SELECT option_d FROM quiz_questions WHERE id=question_id),correct_option=(SELECT correct_option FROM quiz_questions WHERE id=question_id),explanation=(SELECT explanation FROM quiz_questions WHERE id=question_id),sort_order=(SELECT sort_order FROM quiz_questions WHERE id=question_id),book=(SELECT book FROM quiz_questions WHERE id=question_id),chapter=(SELECT chapter FROM quiz_questions WHERE id=question_id),lesson=(SELECT lesson FROM quiz_questions WHERE id=question_id),topic=(SELECT topic FROM quiz_questions WHERE id=question_id),hint=(SELECT hint FROM quiz_questions WHERE id=question_id) WHERE question_text IS NULL");
  },
};
