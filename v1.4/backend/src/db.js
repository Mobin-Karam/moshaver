'use strict';

var fs = require('fs');
var path = require('path');
var DatabaseSync = require('node:sqlite').DatabaseSync;
var env = require('./env');
var security = require('./security');

var dbDir = path.dirname(env.databasePath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

var db = new DatabaseSync(env.databasePath);
db.exec('PRAGMA foreign_keys=ON;');
db.exec('PRAGMA journal_mode=WAL;');
db.exec('PRAGMA synchronous=NORMAL;');
db.exec('PRAGMA busy_timeout=5000;');

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
`);

function ensureColumn(tableName, columnName, sqlType) {
  var cols = db.prepare('PRAGMA table_info(' + tableName + ')').all();
  var exists = cols.some(function(c){ return c.name === columnName; });
  if (!exists) db.exec('ALTER TABLE ' + tableName + ' ADD COLUMN ' + columnName + ' ' + sqlType);
}
ensureColumn('sessions','csrf_hash','TEXT');
ensureColumn('sessions','csrf_token','TEXT');
ensureColumn('sessions','ip_address','TEXT');
ensureColumn('sessions','user_agent','TEXT');
// v1.4 exam delivery fields. Columns are additive so existing SQLite data stays intact.
ensureColumn('exams','student_id','TEXT');
ensureColumn('exams','open_at','TEXT');
ensureColumn('exams','close_at','TEXT');
ensureColumn('exams','duration_minutes','INTEGER NOT NULL DEFAULT 120');
ensureColumn('exams','max_attempts','INTEGER NOT NULL DEFAULT 1');
ensureColumn('exams','instructions','TEXT');
ensureColumn('exams','published','INTEGER NOT NULL DEFAULT 1');
ensureColumn('tasks','exam_id','TEXT REFERENCES exams(id) ON DELETE SET NULL');
// v1.4.2 plan-level daily motivation. Additive migration; existing plans stay intact.
ensureColumn('plans','motivation_text','TEXT');

db.exec(`
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

function now() { return new Date().toISOString(); }

function seedIfEmpty() {
  var studentCount = db.prepare('SELECT COUNT(*) AS n FROM students').get().n;
  var t = now();
  var studentId = 'student_sister';
  if (!studentCount) {
    db.prepare(`INSERT INTO students (id,name,grade,major,target_major,target_city,rank_goal,daily_capacity,active,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,1,?,?)`).run(studentId, env.studentDisplayName, 'دوازدهم انسانی', 'انسانی', 'مدیریت', 'تهران', '۳۰۰ تا ۱۰۰۰', '۶ تا ۷ ساعت مفید', t, t);
  } else {
    var first = db.prepare('SELECT id FROM students ORDER BY created_at LIMIT 1').get();
    studentId = first.id;
  }

  var adminUser = db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('admin');
  if (!adminUser) {
    db.prepare('INSERT INTO users (id,username,password_hash,role,display_name,student_id,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)')
      .run('user_admin', env.adminUsername, security.hashPasswordSync(env.adminPassword), 'admin', env.adminDisplayName, null, t, t);
  }
  var studentUser = db.prepare('SELECT id FROM users WHERE role=? AND student_id=? LIMIT 1').get('student', studentId);
  if (!studentUser) {
    db.prepare('INSERT INTO users (id,username,password_hash,role,display_name,student_id,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)')
      .run('user_student', env.studentUsername, security.hashPasswordSync(env.studentPassword), 'student', env.studentDisplayName, studentId, t, t);
  }

  var subjectCount = db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n;
  if (!subjectCount) seedSubjectsAndPlans(studentId);

  db.prepare('INSERT OR IGNORE INTO app_versions (app_name,version,updated_at) VALUES (?,?,?)').run('student','1.4.2',t);
  db.prepare('INSERT OR IGNORE INTO app_versions (app_name,version,updated_at) VALUES (?,?,?)').run('admin','1.4.2',t);
  db.prepare('INSERT OR IGNORE INTO app_releases (app_name,version,notes,updated_at) VALUES (?,?,?,?)').run('student','1.4.2','نسخه ۱.۴.۲: چت تمام‌قد و خودکار اسکرول، نمایش تاریخ‌های شمسی، خوانایی بهتر کارت‌های برنامه و پیام انگیزشی روزانه قابل کنترل توسط مشاور.',t);
  db.prepare('INSERT OR IGNORE INTO app_releases (app_name,version,notes,updated_at) VALUES (?,?,?,?)').run('admin','1.4.2','نسخه ۱.۴.۲: ویرایش پیام انگیزشی هر روز در برنامه‌ریز و JSON، همراه بهبود چت بدون تغییر بخش‌های دیگر.',t);
  db.prepare('UPDATE app_versions SET version=?,updated_at=? WHERE app_name=?').run('1.4.2',t,'student');
  db.prepare('UPDATE app_versions SET version=?,updated_at=? WHERE app_name=?').run('1.4.2',t,'admin');
}

function seedSubjectsAndPlans(studentId) {
  var seedPath = path.resolve(process.cwd(), 'seed/app-data-original.json');
  if (!fs.existsSync(seedPath)) return;
  var data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  var t = now();

  var insertSubject = db.prepare('INSERT OR IGNORE INTO subjects (id,subject_key,name,display_order,created_at,updated_at) VALUES (?,?,?,?,?,?)');
  var insertStudentSubject = db.prepare('INSERT OR REPLACE INTO student_subjects (student_id,subject_id,status,progress,mastery,note) VALUES (?,?,?,?,?,?)');
  (data.subjects || []).forEach(function(s, index) {
    var sid = 'subject_' + s.id;
    insertSubject.run(sid, s.id, s.name, index + 1, t, t);
    insertStudentSubject.run(studentId, sid, s.status || 'yellow', Number(s.progress || 0), s.mastery || '', s.note || '');
  });

  var insertExam = db.prepare('INSERT OR IGNORE INTO exams (id,title,persian_date,iso_date,note,status,created_at,updated_at,student_id,open_at,close_at,duration_minutes,max_attempts,instructions,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)');
  var insertSyllabus = db.prepare('INSERT OR IGNORE INTO exam_syllabus (id,exam_id,subject_label,description,required,track) VALUES (?,?,?,?,?,?)');
  (data.exams || []).forEach(function(e) {
    insertExam.run(e.id, e.title, e.persianDate, e.isoDate, e.note || '', 'upcoming', t, t, studentId, e.isoDate+'T00:00:00.000Z', e.isoDate+'T23:59:59.999Z', Number(e.durationMinutes||120), 1, e.note||'');
    var i = 0;
    Object.keys(e.syllabus || {}).forEach(function(label) {
      insertSyllabus.run(e.id + '_s_' + (++i), e.id, label, e.syllabus[label], 1, '');
    });
  });

  var insertQuiz = db.prepare('INSERT OR IGNORE INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)');
  var insertQ = db.prepare('INSERT OR IGNORE INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)');
  (data.tests || []).forEach(function(qz) {
    insertQuiz.run(qz.id, qz.title, qz.subject || '', Number(qz.durationMinutes || 20), qz.examId || null, t, t);
    (qz.questions || []).forEach(function(q, idx) {
      var opts = q.options || [];
      var correctIndex = Number(q.answer || 0);
      var letters = ['a','b','c','d'];
      insertQ.run(qz.id + '_q_' + (idx + 1), qz.id, q.q || q.question || '', opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || '', letters[correctIndex] || 'a', q.explanation || '', idx + 1);
    });
  });

  (data.days || []).forEach(function(day) {
    upsertSeedDay(studentId, day, t);
  });
  seedExtendedDays(studentId, t);
}

function upsertSeedDay(studentId, day, t) {
  var planId = 'plan_' + day.id;
  db.prepare(`INSERT OR IGNORE INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,published,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,1,?,?)`).run(planId, studentId, day.isoDate, day.id, day.dayLabel || '', day.persianDate || '', day.title || '', t, t);
  var insertTask = db.prepare(`INSERT OR IGNORE INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,sort_order,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  (day.tasks || []).forEach(function(task, index) {
    insertTask.run(task.id, planId, task.start, task.end, task.type || 'study', task.subject || '', task.title || '', task.pages || '', Number(task.testCount || 0), task.note || '', task.testId || null, index + 1, t, t);
  });
}

function seedExtendedDays(studentId, t) {
  var days = [
    { id:'1405-05-31', isoDate:'2026-08-22', dayLabel:'شنبه', persianDate:'۳۱ مرداد ۱۴۰۵', title:'پایان دور اول بودجه', tasks:[
      ['06:00','07:15','study','ریاضی و آمار','مرور بودجه معادله درجه دوم','صفحات ۹ تا ۲۷',0,''],
      ['07:30','08:30','test','ریاضی و آمار','تست بودجه','',25,'تحلیل کامل'],
      ['08:45','10:00','review','علوم و فنون ادبی','مرور درس‌های ۱ و ۲','صفحات ۱۰ تا ۲۵',0,''],
      ['10:15','11:10','test','علوم و فنون ادبی','تست بودجه','',25,''],
      ['12:15','12:30','prayer','نماز ظهر','نماز ظهر','',0,''],
      ['12:30','13:15','meal','ناهار','ناهار و استراحت','',0,''],
      ['13:15','14:15','review','جامعه‌شناسی','مرور درس‌های ۱ و ۲','صفحات ۱ تا ۲۰',0,''],
      ['14:15','15:00','test','جامعه‌شناسی','تست','',20,''],
      ['16:00','17:00','review','عربی تخصصی','مرور درس ۱','صفحات ۱ تا ۱۶',20,''],
      ['19:15','19:50','meal','شام','شام و استراحت','',0,''],
      ['20:00','21:00','test','آزمون ترکیبی','۳۰ تا ۴۰ تست ترکیبی','',35,''],
      ['21:15','21:45','review','تحلیل','تحلیل آزمون کوچک','',0,'سه ضعف اصلی ثبت شود']
    ]},
    { id:'1405-06-01', isoDate:'2026-08-23', dayLabel:'یکشنبه', persianDate:'۱ شهریور ۱۴۰۵', title:'مرور اجباری‌ها + کلاس سنگین', tasks:[
      ['06:00','07:15','review','تاریخ ۲','مرور دوم + تست','',20,''],['07:30','08:45','review','جغرافیا ۲','مرور دوم + تست','',20,''],['09:00','10:00','test','اقتصاد','۱۵ تست + تحلیل','',15,''],['10:15','11:00','test','روان‌شناسی','۱۵ تست','',15,''],['12:30','13:15','meal','ناهار','ناهار و استراحت','',0,''],['13:15','14:15','test','جامعه‌شناسی','۱۵ تست + مرور','',15,''],['16:45','18:15','class','روان‌شناسی','کلاس سالیانه','',0,''],['18:30','22:45','class','عربی تخصصی','کلاس سالیانه','',0,'نماز و شام در استراحت کلاس']
    ]},
    { id:'1405-06-02', isoDate:'2026-08-24', dayLabel:'دوشنبه', persianDate:'۲ شهریور ۱۴۰۵', title:'آزمون اجباری‌ها + کلاس‌ها', tasks:[
      ['06:00','07:20','test','آزمون اجباری‌ها','روان، تاریخ، جغرافیا، اقتصاد','',40,'زمان‌دار'],['07:35','08:35','review','تحلیل','تحلیل آزمون اجباری‌ها','',0,''],['09:00','09:30','review','دفتر ضعف','ثبت سه مبحث ضعیف','',0,''],['12:30','13:15','meal','ناهار','ناهار و استراحت','',0,''],['13:15','14:15','test','ریاضی و آمار','۲۰ تست','',20,''],['14:30','15:30','test','علوم و فنون ادبی','۲۰ تست','',20,''],['16:45','20:00','class','جامعه‌شناسی','کلاس سالیانه','',0,''],['20:15','23:15','class','فلسفه و منطق','کلاس سالیانه','',0,'']
    ]},
    { id:'1405-06-03', isoDate:'2026-08-25', dayLabel:'سه‌شنبه', persianDate:'۳ شهریور ۱۴۰۵', title:'آزمون مسیر انتخابی + کلاس‌ها', tasks:[
      ['06:00','07:20','test','آزمون مسیر انتخابی','ریاضی، فنون، جامعه، عربی، منطق','',45,''],['07:35','09:00','review','تحلیل','تحلیل کامل آزمون','',0,''],['09:15','10:15','review','تاریخ ۲','فقط نقاط ضعف','',0,''],['10:30','11:30','review','جغرافیا ۲','فقط نقاط ضعف','',0,''],['12:30','13:15','meal','ناهار','ناهار و استراحت','',0,''],['13:15','14:15','review','روان‌شناسی + اقتصاد','۳۰ دقیقه هر درس','',0,''],['16:45','18:45','class','ریاضی و آمار','کلاس سالیانه','',0,''],['20:15','23:15','class','علوم و فنون ادبی','کلاس سالیانه','',0,'']
    ]},
    { id:'1405-06-04', isoDate:'2026-08-26', dayLabel:'چهارشنبه', persianDate:'۴ شهریور ۱۴۰۵', title:'شبیه‌سازی و تحلیل', tasks:[
      ['06:00','08:30','test','آزمون شبیه‌سازی','بودجه کامل ۶ شهریور','',0,'در زمان استاندارد پنل ماز'],['09:00','11:00','review','تحلیل','تحلیل کامل آزمون شبیه‌سازی','',0,'ص/ش/غ/ن + علت'],['12:30','13:15','meal','ناهار','ناهار و استراحت','',0,''],['13:15','15:15','review','ترمیم','فقط سه ضعف اصلی','',0,''],['18:30','20:00','class','اقتصاد','کلاس سالیانه','',0,''],['20:45','21:30','review','دفتر غلط‌ها','مرور غلط‌های آزمون صبح','',0,'']
    ]},
    { id:'1405-06-05', isoDate:'2026-08-27', dayLabel:'پنجشنبه', persianDate:'۵ شهریور ۱۴۰۵', title:'روز قبل آزمون', tasks:[
      ['06:00','06:45','review','روان‌شناسی','خلاصه + غلط‌ها','',0,''],['07:00','07:45','review','تاریخ ۲','تیترها + ترتیب وقایع','',0,''],['08:00','08:45','review','جغرافیا ۲','نقشه ذهنی درس‌های ۱ تا ۴','',0,''],['09:00','09:45','review','اقتصاد','نکات + دفتر بی‌دقتی','',0,''],['10:00','10:40','review','عربی تخصصی','ترجمه + قواعد','',0,''],['10:50','11:30','review','منطق','تعریف‌ها + غلط‌ها','',0,''],['12:30','13:00','meal','ناهار','ناهار سبک','',0,''],['13:00','16:00','class','ریاضی و آمار','کلاس سالیانه','',0,''],['16:30','17:15','review','علوم و فنون ادبی','فقط نکات مهم','',0,''],['17:15','18:00','review','جامعه‌شناسی','مرور درس ۱ و ۲','',0,''],['19:20','19:55','meal','شام','شام و استراحت','',0,''],['20:00','20:45','review','دفتر غلط‌ها','آخرین مرور','',0,''],['21:00','22:00','break','آماده‌سازی','وسایل آزمون + خواب به‌موقع','',0,'']
    ]},
    { id:'1405-06-06', isoDate:'2026-08-28', dayLabel:'جمعه', persianDate:'۶ شهریور ۱۴۰۵', title:'روز آزمون', tasks:[
      ['06:00','06:20','review','مرور سبک','فقط نکات خیلی کوتاه','',0,'هیچ تست جدیدی نزن'],['08:00','12:00','exam','آزمون ۶ شهریور','اولین سنجش واقعی','',0,'زمان دقیق طبق پنل آزمون'],['12:30','14:00','meal','ناهار و استراحت','استراحت کامل','',0,''],['16:00','17:00','review','ثبت نتیجه','درصد، تراز، صحیح، غلط، نزده','',0,''],['17:00','18:00','review','تحلیل اولیه','علت خطاها را ثبت کن','',0,'علمی/فراموشی/بی‌دقتی/زمان/شک']
    ]}
  ];
  days.forEach(function(day){
    day.tasks = day.tasks.map(function(x, idx) {
      return { id: day.id + '_t_' + (idx + 1), start:x[0], end:x[1], type:x[2], subject:x[3], title:x[4], pages:x[5], testCount:x[6], note:x[7] || '' };
    });
    upsertSeedDay(studentId, day, t);
  });
}

function getDb() { return db; }

seedIfEmpty();
try { db.prepare("UPDATE exams SET student_id='student_sister' WHERE student_id IS NULL").run(); } catch (e) {}

module.exports = { db: db, getDb: getDb, now: now, seedIfEmpty: seedIfEmpty };
