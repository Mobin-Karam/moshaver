"use strict";

var createImportsValidation = require("../validation/imports.validation");
var createImportService = require("../services/import.service");

function registerImportsRoutes(router, deps) {
  var db = deps.db;
  var str = deps.str;
  var query = deps.query;
  var ok = deps.ok;
  var fail = deps.fail;
  var todayIso = deps.todayIso;
  var addIsoDays = deps.addIsoDays;
  var validate = createImportsValidation(deps);
  var importService = createImportService(deps);

  router.add(
    "GET",
    /^\/api\/v1\/admin\/export\/json$/,
    ["admin"],
    function (req, res) {
      var q = query(req), sid = str(q.studentId, 120);
      if (!sid) return fail(res, 400, "VALIDATION", "studentId لازم است.");
      var student = db.prepare("SELECT id,name,grade,major FROM students WHERE id=? AND account_status<>'archived'").get(sid);
      if (!student) return fail(res, 404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
      var from = /^\d{4}-\d{2}-\d{2}$/.test(String(q.from || "")) ? String(q.from) : "0000-01-01";
      var to = /^\d{4}-\d{2}-\d{2}$/.test(String(q.to || "")) ? String(q.to) : "9999-12-31";
      var planRows = db.prepare("SELECT * FROM plans WHERE student_id=? AND plan_date BETWEEN ? AND ? ORDER BY plan_date").all(sid, from, to);
      var planTasks = {}, linkedExamIds = {};
      planRows.forEach(function (p) {
        planTasks[p.id] = db.prepare("SELECT start_time AS start,end_time AS end,type,subject,title,pages,test_count AS testCount,note,quiz_id AS quizId,exam_id AS examId,sort_order AS sortOrder FROM tasks WHERE plan_id=? ORDER BY sort_order,start_time").all(p.id);
        planTasks[p.id].forEach(function (task) { if (task.examId) linkedExamIds[task.examId] = 1; });
      });
      var examRows = db.prepare("SELECT * FROM exams WHERE student_id=? AND iso_date BETWEEN ? AND ? ORDER BY iso_date,created_at").all(sid, from, to);
      Object.keys(linkedExamIds).forEach(function (examId) {
        if (!examRows.some(function (exam) { return exam.id === examId; })) {
          var linked = db.prepare("SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)").get(examId, sid);
          if (linked) examRows.push(linked);
        }
      });
      var exportedExamIds = {}; examRows.forEach(function (exam) { exportedExamIds[exam.id] = 1; });
      var plans = planRows.map(function (p) {
        return { planDate:p.plan_date,jalaliId:p.jalali_id||"",dayLabel:p.day_label||"",persianDate:p.persian_date||"",title:p.title||"",motivationText:p.motivation_text||"",published:!!p.published,tasks:planTasks[p.id].map(function(task){return {start:task.start,end:task.end,type:task.type,subject:task.subject||"",title:task.title||"",pages:task.pages||"",testCount:task.testCount||0,note:task.note||"",quizId:task.quizId||null,examRef:task.examId&&exportedExamIds[task.examId]?task.examId:null,sortOrder:task.sortOrder||0};}) };
      });
      var exams = examRows.sort(function(a,b){return String(a.iso_date).localeCompare(String(b.iso_date))||String(a.created_at).localeCompare(String(b.created_at));}).map(function (e) {
        var quiz=db.prepare("SELECT id FROM quizzes WHERE exam_id=? AND active=1 ORDER BY created_at LIMIT 1").get(e.id);
        return { ref:e.id,title:e.title,persianDate:e.persian_date||"",isoDate:e.iso_date,note:e.note||"",status:e.status,published:!!e.published,openAt:e.open_at,closeAt:e.close_at,durationMinutes:e.duration_minutes,maxAttempts:e.max_attempts,instructions:e.instructions||"",syllabus:db.prepare("SELECT subject_label AS subject,description,required,track FROM exam_syllabus WHERE exam_id=? ORDER BY rowid").all(e.id),questions:quiz?db.prepare("SELECT question_text AS question,option_a,option_b,option_c,option_d,correct_option AS correctOption,explanation,sort_order AS sortOrder,book,chapter,lesson,topic,hint FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order").all(quiz.id).map(function(x){return {question:x.question,options:[x.option_a,x.option_b,x.option_c,x.option_d],correctOption:x.correctOption,explanation:x.explanation||"",book:x.book||"",chapter:x.chapter||"",lesson:x.lesson||"",topic:x.topic||"",hint:x.hint||"",sortOrder:x.sortOrder};}):[] };
      });
      ok(res,{schemaVersion:2,exportedAt:new Date().toISOString(),student:{id:student.id,name:student.name,grade:student.grade,major:student.major},range:{from:from,to:to},plans:plans,exams:exams});
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/import\/template$/,
    ["admin"],
    function (req, res) {
      var q = query(req),
        sid = str(q.studentId, 120) || null,
        d = addIsoDays(todayIso(), 7);
      ok(res, {
        schemaVersion: 2,
        studentId: sid,
        plans: [
          {
            planDate: todayIso(),
            jalaliId: "",
            dayLabel: "",
            persianDate: "",
            title: "برنامه روزانه",
            motivationText:
              "امروز فقط روی قدم بعدی تمرکز کن؛ پیشرفت از همین قدم‌های کوچک ساخته می‌شود.",
            published: false,
            tasks: [
              {
                start: "07:00",
                end: "08:00",
                type: "study",
                subject: "روان‌شناسی",
                title: "مطالعه درس",
                pages: "",
                testCount: 0,
                note: "",
                quizId: null,
              },
              {
                start: "08:10",
                end: "08:35",
                type: "exam",
                subject: "روان‌شناسی",
                title: "آزمون نمونه",
                testCount: 10,
                note: "بعد از مطالعه، همین‌جا آزمون را باز کن.",
                examRef: "exam-sample",
              },
            ],
          },
        ],
        exams: [
          {
            ref: "exam-sample",
            title: "آزمون نمونه",
            persianDate: "",
            isoDate: d,
            openAt: d + "T08:00:00+03:30",
            closeAt: d + "T12:00:00+03:30",
            durationMinutes: 120,
            maxAttempts: 1,
            published: false,
            note: "",
            instructions:
              "پس از شروع، زمان آزمون ادامه پیدا می‌کند. آزمون فقط یک‌بار قابل انجام است.",
            status: "upcoming",
            syllabus: [
              {
                subject: "روان‌شناسی",
                description: "درس ۱",
                required: true,
                track: "",
              },
            ],
            questions: [
              {
                question: "نمونه سؤال را با سؤال واقعی جایگزین کنید.",
                options: ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
                correctOption: "a",
                explanation: "توضیح پاسخ",
              },
            ],
          },
        ],
      });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/admin\/import\/preview$/,
    ["admin"],
    function (req, res, match, body) {
      ok(res, validate.preview(body).value);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/admin\/import\/commit$/,
    ["admin"],
    function (req, res, match, body, user) {
      var input = validate.commit(body);
      if (input.error)
        return fail(
          res,
          input.error.status,
          input.error.code,
          input.error.message,
          input.error.details,
        );
      var result = importService.commit(
        input.value.normalized,
        input.value.options,
        user,
      );
      if (result.error)
        return fail(
          res,
          result.error.status,
          result.error.code,
          result.error.message,
        );
      ok(res, result.data, 201);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/import\/history$/,
    ["admin"],
    function (req, res) {
      ok(
        res,
        db
          .prepare(
            `SELECT di.*,s.name AS studentName,u.display_name AS createdByName FROM data_imports di LEFT JOIN students s ON s.id=di.student_id LEFT JOIN users u ON u.id=di.created_by ORDER BY di.created_at DESC LIMIT 100`,
          )
          .all(),
      );
    },
  );
}

module.exports = registerImportsRoutes;
