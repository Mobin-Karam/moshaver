'use strict';

var fs = require('fs');
var path = require('path');
var DatabaseSync = require('node:sqlite').DatabaseSync;
var env = require('./env');
var security = require('./security');
var migrations = require('./migrations');

var dbDir = path.dirname(env.databasePath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

var db = new DatabaseSync(env.databasePath);
db.exec('PRAGMA foreign_keys=ON;');
db.exec('PRAGMA journal_mode=WAL;');
db.exec('PRAGMA synchronous=NORMAL;');
db.exec('PRAGMA busy_timeout=5000;');

function now() { return new Date().toISOString(); }

migrations.runMigrations(db, now);

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

  db.prepare('INSERT OR IGNORE INTO app_versions (app_name,version,updated_at) VALUES (?,?,?)').run('student','1.6.0',t);
  db.prepare('INSERT OR IGNORE INTO app_versions (app_name,version,updated_at) VALUES (?,?,?)').run('admin','1.6.0',t);
  db.prepare('INSERT OR IGNORE INTO app_releases (app_name,version,notes,updated_at) VALUES (?,?,?,?)').run('student','1.6.0','نسخه ۱.۶.۰: صفحه امروز سبک، جلسه مطالعه با مکث و ثبت تست، مرور هدایت‌شده با دلیل و تاریخچه، و گزارش هفتگی شفاف.',t);
  db.prepare('INSERT OR IGNORE INTO app_releases (app_name,version,notes,updated_at) VALUES (?,?,?,?)').run('admin','1.6.0','نسخه ۱.۶.۰: مدیریت کامل حساب و بایگانی امن، پرونده مرکزی دانش‌آموز، نیازمند توجه با دلیل، و اقدام مستقیم از نقاط ضعف.',t);
  db.prepare('UPDATE app_versions SET version=?,updated_at=? WHERE app_name=?').run('1.6.0',t,'student');
  db.prepare('UPDATE app_versions SET version=?,updated_at=? WHERE app_name=?').run('1.6.0',t,'admin');
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

module.exports = { db: db, getDb: getDb, now: now, seedIfEmpty: seedIfEmpty };
