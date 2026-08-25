"use strict";

var fs=require("node:fs"),path=require("node:path");
var db=require("../src/db").db;
var fixture=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../moshaver-30-day-all-task-types.json"),"utf8"));
var username=String(process.env.SEED_STUDENT_USERNAME||"").trim();
var student=username?db.prepare("SELECT s.id,s.name FROM students s JOIN users u ON u.student_id=s.id WHERE u.username=? AND u.role='student' AND u.is_active=1 AND s.account_status<>'archived'").get(username):db.prepare("SELECT id,name FROM students WHERE account_status<>'archived' ORDER BY created_at LIMIT 1").get();
if(!student)throw new Error("No active student found. Run npm run seed first or set SEED_STUDENT_USERNAME.");
var stamp=new Date().toISOString(),prefix="fixture_month_20260825_";
db.exec("BEGIN IMMEDIATE");
try{
  fixture.exams.forEach(function(e,ei){
    var examId=prefix+"exam_"+(ei+1),quizId=prefix+"quiz_"+(ei+1);
    db.prepare("INSERT INTO exams(id,title,persian_date,iso_date,note,status,created_at,updated_at,student_id,open_at,close_at,duration_minutes,max_attempts,instructions,published) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,persian_date=excluded.persian_date,iso_date=excluded.iso_date,note=excluded.note,status=excluded.status,updated_at=excluded.updated_at,student_id=excluded.student_id,open_at=excluded.open_at,close_at=excluded.close_at,duration_minutes=excluded.duration_minutes,max_attempts=excluded.max_attempts,instructions=excluded.instructions,published=excluded.published").run(examId,e.title,e.persianDate,e.isoDate,e.note,e.status,stamp,stamp,student.id,e.openAt,e.closeAt,e.durationMinutes,e.maxAttempts||1,e.instructions,e.published?1:0);
    db.prepare("DELETE FROM exam_syllabus WHERE exam_id=?").run(examId);
    e.syllabus.forEach(function(s,si){db.prepare("INSERT INTO exam_syllabus(id,exam_id,subject_label,description,required,track) VALUES(?,?,?,?,?,?)").run(examId+"_s"+(si+1),examId,s.subject,s.description,s.required===false?0:1,s.track||"");});
    db.prepare("INSERT INTO quizzes(id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subject=excluded.subject,duration_minutes=excluded.duration_minutes,exam_id=excluded.exam_id,active=1,updated_at=excluded.updated_at").run(quizId,e.title,e.syllabus[0].subject,e.durationMinutes,examId,stamp,stamp);
    db.prepare("DELETE FROM quiz_questions WHERE quiz_id=?").run(quizId);
    e.questions.forEach(function(q,qi){db.prepare("INSERT INTO quiz_questions(id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)").run(quizId+"_q"+(qi+1),quizId,q.question,q.options[0],q.options[1],q.options[2],q.options[3],q.correctOption,q.explanation,qi+1);});
  });
  fixture.plans.forEach(function(p,pi){
    var planId=prefix+"plan_"+(pi+1);
    var existing=db.prepare("SELECT id FROM plans WHERE student_id=? AND plan_date=?").get(student.id,p.planDate);
    if(existing&&existing.id!==planId)db.prepare("DELETE FROM plans WHERE id=?").run(existing.id);
    db.prepare("INSERT INTO plans(id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,plan_date=excluded.plan_date,jalali_id=excluded.jalali_id,day_label=excluded.day_label,persian_date=excluded.persian_date,title=excluded.title,motivation_text=excluded.motivation_text,published=excluded.published,updated_at=excluded.updated_at").run(planId,student.id,p.planDate,p.jalaliId,p.dayLabel,p.persianDate,p.title,p.motivationText,p.published?1:0,stamp,stamp);
    db.prepare("DELETE FROM tasks WHERE plan_id=?").run(planId);
    p.tasks.forEach(function(t,ti){var examId=t.examRef?prefix+"exam_"+(pi+1):null;db.prepare("INSERT INTO tasks(id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(planId+"_t"+(ti+1),planId,t.start,t.end,t.type,t.subject||"",t.title,t.pages||"",Number(t.testCount||0),t.note||"",null,examId,ti+1,stamp,stamp);});
  });
  db.exec("COMMIT");
  console.log("TEST MONTH SEEDED for "+student.name+" ("+student.id+"): 30 plans, 360 tasks, 30 exams, 120 questions");
}catch(error){try{db.exec("ROLLBACK");}catch(ignore){}throw error;}finally{db.close();}
