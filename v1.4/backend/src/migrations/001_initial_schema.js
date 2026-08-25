"use strict";

function ensureColumn(db, tableName, columnName, sqlType) {
  var cols = db.prepare("PRAGMA table_info(" + tableName + ")").all();
  var exists = cols.some(function (c) {
    return c.name === columnName;
  });
  if (!exists)
    db.exec("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + sqlType);
}

function up(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'دوازدهم انسانی',
  major TEXT NOT NULL DEFAULT 'انسانی',
  target_major TEXT,
  target_city TEXT,
  rank_goal TEXT,
  daily_capacity TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','student')),
  display_name TEXT NOT NULL,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  csrf_hash TEXT,
  csrf_token TEXT,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  subject_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_subjects (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'yellow',
  progress INTEGER NOT NULL DEFAULT 0,
  mastery TEXT,
  note TEXT,
  PRIMARY KEY(student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  persian_date TEXT NOT NULL,
  iso_date TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exams_iso_date ON exams(iso_date);

CREATE TABLE IF NOT EXISTS exam_syllabus (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_label TEXT NOT NULL,
  description TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  track TEXT
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  jalali_id TEXT,
  day_label TEXT,
  persian_date TEXT,
  title TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, plan_date)
);
CREATE INDEX IF NOT EXISTS idx_plans_student_date ON plans(student_id, plan_date);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK(correct_option IN ('a','b','c','d')),
  explanation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  title TEXT,
  pages TEXT,
  test_count INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
  exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_plan_order ON tasks(plan_id, sort_order, start_time);

CREATE TABLE IF NOT EXISTS task_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'done' CHECK(status IN ('done','partial','skipped')),
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  actual_tests INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(task_id, student_id)
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  study_hours TEXT,
  tests INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  blank INTEGER NOT NULL DEFAULT 0,
  focus INTEGER NOT NULL DEFAULT 0,
  fatigue INTEGER NOT NULL DEFAULT 0,
  motivation INTEGER NOT NULL DEFAULT 0,
  problem TEXT,
  tomorrow TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, plan_date)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  correct INTEGER NOT NULL,
  wrong INTEGER NOT NULL,
  blank INTEGER NOT NULL,
  percent INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct INTEGER NOT NULL,
  error_reason TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_versions (
  app_name TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS syllabus_progress (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  syllabus_id TEXT NOT NULL REFERENCES exam_syllabus(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','tested','review','mastered')),
  accuracy INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(student_id, syllabus_id)
);

CREATE TABLE IF NOT EXISTS recovery_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  reason TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recovery_student_status ON recovery_requests(student_id,status,created_at);

CREATE TABLE IF NOT EXISTS app_releases (
  app_name TEXT NOT NULL,
  version TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(app_name, version)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished','cancelled')),
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_student_status ON study_sessions(student_id,status,started_at);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_events_student_created ON activity_events(student_id,created_at DESC);

CREATE TABLE IF NOT EXISTS student_presence (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'online',
  active_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  active_session_id TEXT REFERENCES study_sessions(id) ON DELETE SET NULL,
  last_seen_at TEXT NOT NULL,
  device_label TEXT
);

CREATE TABLE IF NOT EXISTS task_issues (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
  advisor_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_issues_student_status ON task_issues(student_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS advisor_comments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  visible_to_student INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_advisor_comments_student_task ON advisor_comments(student_id,task_id,created_at DESC);

CREATE TABLE IF NOT EXISTS review_items (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  syllabus_id TEXT REFERENCES exam_syllabus(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL,
  interval_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','skipped')),
  completed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(student_id,syllabus_id,due_date)
);
CREATE INDEX IF NOT EXISTS idx_review_items_due ON review_items(student_id,status,due_date);

CREATE TABLE IF NOT EXISTS data_imports (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  source_name TEXT,
  plan_count INTEGER NOT NULL DEFAULT 0,
  task_count INTEGER NOT NULL DEFAULT 0,
  exam_count INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK(sender_role IN ('admin','student')),
  message_text TEXT NOT NULL,
  reply_to_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON chat_messages(conversation_id,created_at,id);

CREATE TABLE IF NOT EXISTS chat_reads (
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TEXT NOT NULL,
  PRIMARY KEY(conversation_id,user_id)
);

CREATE TABLE IF NOT EXISTS realtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audience_role TEXT NOT NULL CHECK(audience_role IN ('admin','student','all')),
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_realtime_events_audience ON realtime_events(audience_role,student_id,id);

CREATE TABLE IF NOT EXISTS quiz_runs (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','submitted','cancelled')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quiz_runs_student_status ON quiz_runs(student_id,status,started_at);

CREATE TABLE IF NOT EXISTS exam_attempt_requests (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  advisor_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_requests_student ON exam_attempt_requests(student_id,exam_id,status,created_at DESC);
`);

  ensureColumn(db, "sessions", "csrf_hash", "TEXT");
  ensureColumn(db, "sessions", "csrf_token", "TEXT");
  ensureColumn(db, "sessions", "ip_address", "TEXT");
  ensureColumn(db, "sessions", "user_agent", "TEXT");
  ensureColumn(db, "exams", "student_id", "TEXT");
  ensureColumn(db, "exams", "open_at", "TEXT");
  ensureColumn(db, "exams", "close_at", "TEXT");
  ensureColumn(db, "exams", "duration_minutes", "INTEGER NOT NULL DEFAULT 120");
  ensureColumn(db, "exams", "max_attempts", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "exams", "instructions", "TEXT");
  ensureColumn(db, "exams", "published", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "tasks", "exam_id", "TEXT REFERENCES exams(id) ON DELETE SET NULL");
  ensureColumn(db, "plans", "motivation_text", "TEXT");
}

module.exports = {
  version: 1,
  name: "initial_schema",
  up: up,
};
