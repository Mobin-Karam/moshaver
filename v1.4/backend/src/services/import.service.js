"use strict";

function createImportService(deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var notifyStudent = deps.notifyStudent;
  var emitStudent = deps.emitStudent;
  var audit = deps.audit;

  function commit(normalized, options, user) {
    try {
      return { data: commitImport(normalized, options, user) };
    } catch (e) {
      if (
        String(e.message).indexOf("PLAN_EXISTS:") === 0 ||
        String(e.message).indexOf("EXAM_EXISTS:") === 0
      ) {
        return {
          error: {
            status: 409,
            code: "IMPORT_CONFLICT",
            message: String(e.message),
          },
        };
      }
      throw e;
    }
  }

  function commitImport(normalized, options, user) {
    if (normalized.errors.length) throw new Error("IMPORT_VALIDATION");
    var opts = options || {};
    var timestamp = now();
    var studentId = normalized.studentId;
    var createdPlans = 0;
    var createdTasks = 0;
    var createdExams = 0;
    var createdQuestions = 0;
    var examRefMap = {};
    db.exec("BEGIN IMMEDIATE");
    try {
      normalized.exams.forEach(function (exam) {
        var existing = db
          .prepare("SELECT id FROM exams WHERE student_id=? AND title=? AND iso_date=? LIMIT 1")
          .get(studentId, exam.title, exam.isoDate);
        if (existing) {
          if (!opts.replaceExistingExams) throw new Error("EXAM_EXISTS:" + exam.title);
          db.prepare("DELETE FROM exams WHERE id=?").run(existing.id);
        }
        var examId = security.id("exam");
        db.prepare(
          "INSERT INTO exams (id,title,persian_date,iso_date,note,status,created_at,updated_at,student_id,open_at,close_at,duration_minutes,max_attempts,instructions,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          examId,
          exam.title,
          exam.persianDate,
          exam.isoDate,
          exam.note,
          exam.status,
          timestamp,
          timestamp,
          studentId,
          exam.openAt,
          exam.closeAt,
          exam.durationMinutes,
          exam.maxAttempts,
          exam.instructions,
          opts.publishImported || exam.published ? 1 : 0,
        );
        if (exam.ref) examRefMap[exam.ref] = examId;
        examRefMap[exam.isoDate + "|" + exam.title] = examId;
        exam.syllabus.forEach(function (item) {
          db.prepare(
            "INSERT INTO exam_syllabus (id,exam_id,subject_label,description,required,track) VALUES (?,?,?,?,?,?)",
          ).run(
            security.id("syllabus"),
            examId,
            item.subject,
            item.description,
            item.required ? 1 : 0,
            item.track,
          );
        });
        var quizId = security.id("quiz");
        db.prepare(
          "INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
        ).run(quizId, exam.title, "آزمون اصلی", exam.durationMinutes, examId, timestamp, timestamp);
        exam.questions.forEach(function (question) {
          db.prepare(
            "INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)",
          ).run(
            security.id("question"),
            quizId,
            question.question,
            question.options[0],
            question.options[1],
            question.options[2],
            question.options[3],
            question.correctOption,
            question.explanation,
            question.sortOrder,
          );
          createdQuestions++;
        });
        createdExams++;
      });
      normalized.plans.forEach(function (plan) {
        var existing = db
          .prepare("SELECT id FROM plans WHERE student_id=? AND plan_date=?")
          .get(studentId, plan.planDate);
        if (existing) {
          if (!opts.replaceExistingPlans) throw new Error("PLAN_EXISTS:" + plan.planDate);
          db.prepare("DELETE FROM plans WHERE id=?").run(existing.id);
        }
        var planId = security.id("plan");
        db.prepare(
          "INSERT INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          planId,
          studentId,
          plan.planDate,
          plan.jalaliId,
          plan.dayLabel,
          plan.persianDate,
          plan.title,
          plan.motivationText || "",
          opts.publishImported ? 1 : plan.published ? 1 : 0,
          timestamp,
          timestamp,
        );
        plan.tasks.forEach(function (task, index) {
          var linkedExamId = task.examId || null;
          if (!linkedExamId && task.examRef) linkedExamId = examRefMap[task.examRef] || null;
          if (!linkedExamId && task.type === "exam") {
            linkedExamId = examRefMap[plan.planDate + "|" + task.title] || null;
          }
          if (
            linkedExamId &&
            !db
              .prepare("SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
              .get(linkedExamId, studentId)
          ) {
            linkedExamId = null;
          }
          db.prepare(
            "INSERT INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          ).run(
            security.id("task"),
            planId,
            task.start,
            task.end,
            task.type,
            task.subject,
            task.title,
            task.pages,
            task.testCount,
            task.note,
            task.quizId,
            linkedExamId,
            task.sortOrder || index + 1,
            timestamp,
            timestamp,
          );
          createdTasks++;
        });
        createdPlans++;
      });
      var importId = security.id("import");
      db.prepare(
        "INSERT INTO data_imports (id,student_id,source_name,plan_count,task_count,exam_count,published,summary_json,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).run(
        importId,
        studentId,
        str(opts.sourceName, 200) || "JSON import",
        createdPlans,
        createdTasks,
        createdExams,
        opts.publishImported ? 1 : 0,
        JSON.stringify(normalized.summary),
        user.id,
        timestamp,
      );
      db.exec("COMMIT");
      if (opts.publishImported) {
        notifyStudent(studentId, "برنامه و آزمون جدید", "اطلاعات جدید توسط مشاور منتشر شد.");
        emitStudent(studentId, "plan.published", {
          studentId: studentId,
          source: "json-import",
          plans: createdPlans,
          exams: createdExams,
        });
        emitStudent(studentId, "exam.updated", {
          studentId: studentId,
          exams: createdExams,
        });
      }
      audit(user, "import", "student_data", importId, {
        studentId: studentId,
        plans: createdPlans,
        tasks: createdTasks,
        exams: createdExams,
        questions: createdQuestions,
        published: !!opts.publishImported,
      });
      return {
        importId: importId,
        studentId: studentId,
        plans: createdPlans,
        tasks: createdTasks,
        exams: createdExams,
        questions: createdQuestions,
        published: !!opts.publishImported,
      };
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch (rollbackError) {}
      throw error;
    }
  }

  return {
    commit: commit,
  };
}

module.exports = createImportService;
