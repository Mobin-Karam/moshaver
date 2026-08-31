"use strict";

function createImportsValidation(deps) {
  var TASK_TYPES = ["study", "review", "test", "class", "prayer", "meal", "break", "exam"];
  var db = deps.db;
  var str = deps.str;
  var num = deps.num;
  var isoDateValid = deps.isoDateValid;
  var dateTimeValid = deps.dateTimeValid;
  var timeValid = deps.timeValid;

  function normalizeImportPayload(input, fallbackStudentId) {
    var src = input && typeof input === "object" ? input : {};
    var errors = [];
    var warnings = [];
    var conflicts = [];
    var schemaVersion = Number(src.schemaVersion || 2);
    if ([1, 2].indexOf(schemaVersion) < 0) {
      errors.push("Unsupported schemaVersion: " + String(src.schemaVersion) + ". Supported versions are 1 and 2.");
    }
    var studentId = str(fallbackStudentId || src.studentId, 120);
    if (!studentId) errors.push("studentId is required.");
    if (studentId && !db.prepare("SELECT id FROM students WHERE id=?").get(studentId)) {
      errors.push("Student not found: " + studentId);
    }
    var plans = [];
    var planSeen = {};
    (Array.isArray(src.plans) ? src.plans : []).forEach(function (plan, planIndex) {
      var date = str(plan.planDate, 10);
      if (!isoDateValid(date)) {
        errors.push("plans[" + planIndex + "].planDate must be YYYY-MM-DD.");
        return;
      }
      if (planSeen[date]) errors.push("Duplicate imported plan date: " + date);
      planSeen[date] = 1;
      var tasks = [];
      (Array.isArray(plan.tasks) ? plan.tasks : []).forEach(function (task, taskIndex) {
        var start = str(task.start, 5);
        var end = str(task.end, 5);
        if (!timeValid(start) || !timeValid(end)) {
          errors.push("Invalid time in " + date + " task " + (taskIndex + 1));
          return;
        }
        if (end <= start) {
          errors.push("Task end time must be after start time: " + date + " " + start + "-" + end);
          return;
        }
        var taskType = str(task.type, 30) || "study";
        if (TASK_TYPES.indexOf(taskType) < 0) {
          errors.push("Unsupported task type in " + date + " task " + (taskIndex + 1) + ": " + taskType);
          return;
        }
        var quizId = str(task.quizId, 120) || null;
        var examId = str(task.examId, 120) || null;
        if (examId && !db.prepare("SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)").get(examId, studentId)) {
          errors.push("Invalid or inaccessible examId in " + date + " task " + (taskIndex + 1));
          return;
        }
        if (quizId && !db.prepare("SELECT q.id FROM quizzes q LEFT JOIN exams e ON e.id=q.exam_id WHERE q.id=? AND q.active=1 AND (q.exam_id IS NULL OR e.student_id=? OR e.student_id IS NULL)").get(quizId, studentId)) {
          errors.push("Invalid or inaccessible quizId in " + date + " task " + (taskIndex + 1));
          return;
        }
        tasks.push({
          start: start,
          end: end,
          type: taskType,
          subject: str(task.subject, 150),
          title: str(task.title, 300),
          pages: str(task.pages, 120),
          testCount: Math.max(0, num(task.testCount, 0)),
          note: str(task.note, 1500),
          quizId: quizId,
          examId: examId,
          examRef: str(task.examRef, 120) || null,
          sortOrder: num(task.sortOrder, taskIndex + 1),
        });
      });
      for (var left = 0; left < tasks.length; left++) {
        for (var right = left + 1; right < tasks.length; right++) {
          if (tasks[left].start < tasks[right].end && tasks[right].start < tasks[left].end) {
            conflicts.push(
              date +
                ": " +
                tasks[left].start +
                "-" +
                tasks[left].end +
                " overlaps " +
                tasks[right].start +
                "-" +
                tasks[right].end,
            );
          }
        }
      }
      if (
        studentId &&
        db.prepare("SELECT id FROM plans WHERE student_id=? AND plan_date=?").get(studentId, date)
      ) {
        warnings.push("Existing plan found for " + date + ".");
        var existingProgress = db.prepare(
          "SELECT COUNT(*) AS n FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE p.student_id=? AND p.plan_date=? AND (EXISTS(SELECT 1 FROM task_completions tc WHERE tc.task_id=t.id) OR EXISTS(SELECT 1 FROM study_sessions ss WHERE ss.task_id=t.id))",
        ).get(studentId, date);
        if (existingProgress && existingProgress.n) warnings.push("Existing plan has recorded progress and cannot be replaced: " + date + ".");
      }
      plans.push({
        planDate: date,
        jalaliId: str(plan.jalaliId, 40),
        dayLabel: str(plan.dayLabel, 60),
        persianDate: str(plan.persianDate, 100),
        title: str(plan.title, 250),
        motivationText: str(plan.motivationText || plan.motivation, 600),
        published: !!plan.published,
        tasks: tasks,
      });
    });
    var exams = [];
    var questionCount = 0;
    (Array.isArray(src.exams) ? src.exams : []).forEach(function (exam, examIndex) {
      var date = str(exam.isoDate, 10);
      var title = str(exam.title, 250);
      if (!title || !isoDateValid(date)) {
        errors.push("exams[" + examIndex + "] needs title and isoDate.");
        return;
      }
      var openAt = str(exam.openAt, 80) || date + "T08:00:00+03:30";
      var closeAt = str(exam.closeAt, 80) || date + "T13:00:00+03:30";
      if (!dateTimeValid(openAt) || !dateTimeValid(closeAt) || new Date(closeAt) <= new Date(openAt)) {
        errors.push("exams[" + examIndex + "] has invalid openAt/closeAt.");
        return;
      }
      var syllabus = [];
      (Array.isArray(exam.syllabus) ? exam.syllabus : []).forEach(function (item) {
        if (str(item.subject, 150) && str(item.description, 1200)) {
          syllabus.push({
            subject: str(item.subject, 150),
            description: str(item.description, 1200),
            required: item.required !== false,
            track: str(item.track, 120),
          });
        }
      });
      var rawQuestions = Array.isArray(exam.questions)
        ? exam.questions
        : exam.quiz && Array.isArray(exam.quiz.questions)
          ? exam.quiz.questions
          : [];
      var questions = [];
      rawQuestions.forEach(function (question, questionIndex) {
        var options = Array.isArray(question.options) ? question.options : [];
        var correctOption = str(question.correctOption || question.answer, 20).toLowerCase();
        if (/^[0-3]$/.test(correctOption)) correctOption = ["a", "b", "c", "d"][Number(correctOption)];
        var normalizedOptions = options.map(function (option) { return str(option, 1000); });
        var uniqueOptions = {};
        normalizedOptions.forEach(function (option) { uniqueOptions[option] = 1; });
        if (
          !str(question.question || question.q, 2000) ||
          options.length !== 4 ||
          normalizedOptions.some(function (option) { return !option; }) ||
          Object.keys(uniqueOptions).length !== 4 ||
          ["a", "b", "c", "d"].indexOf(correctOption) < 0
        ) {
          errors.push(
            "exams[" +
              examIndex +
              "].questions[" +
              questionIndex +
              "] needs question, 4 distinct non-empty options, correctOption a/b/c/d.",
          );
          return;
        }
        questions.push({
          question: str(question.question || question.q, 2000),
          options: normalizedOptions,
          correctOption: correctOption,
          explanation: str(question.explanation, 2000),
          book: str(question.book, 200),
          chapter: str(question.chapter, 200),
          lesson: str(question.lesson, 200),
          topic: str(question.topic, 240),
          hint: str(question.hint, 3000),
          sortOrder: num(question.sortOrder, questionIndex + 1),
        });
      });
      questionCount += questions.length;
      if (
        studentId &&
        db
          .prepare("SELECT id FROM exams WHERE student_id=? AND title=? AND iso_date=? LIMIT 1")
          .get(studentId, title, date)
      ) {
        warnings.push("Existing exam found: " + title + " " + date + ".");
      }
      var status = str(exam.status, 30) || "upcoming";
      if (["upcoming", "active", "completed", "cancelled"].indexOf(status) < 0) {
        errors.push("exams[" + examIndex + "].status must be upcoming, active, completed, or cancelled.");
        return;
      }
      exams.push({
        ref: str(exam.ref, 120) || null,
        title: title,
        persianDate: str(exam.persianDate, 100) || date,
        isoDate: date,
        note: str(exam.note, 1500),
        status: status,
        published: exam.published !== false,
        openAt: openAt,
        closeAt: closeAt,
        durationMinutes: Math.min(600, Math.max(1, num(exam.durationMinutes, 120))),
        maxAttempts: Math.min(100, Math.max(1, num(exam.maxAttempts, 1))),
        instructions: str(exam.instructions, 3000),
        syllabus: syllabus,
        questions: questions,
      });
    });
    var knownExamRefs = {};
    exams.forEach(function (exam) {
      if (exam.ref) {
        if (knownExamRefs[exam.ref]) errors.push("Duplicate exam ref: " + exam.ref);
        knownExamRefs[exam.ref] = 1;
      }
    });
    plans.forEach(function (plan) {
      plan.tasks.forEach(function (task) {
        if (task.examRef && !knownExamRefs[task.examRef]) {
          errors.push("Unknown examRef " + task.examRef + " in plan " + plan.planDate + ".");
        }
      });
    });
    if (!plans.length && !exams.length) errors.push("Import must contain at least one valid plan or exam.");
    var taskCount = 0;
    plans.forEach(function (plan) {
      taskCount += plan.tasks.length;
    });
    return {
      schemaVersion: schemaVersion,
      studentId: studentId,
      plans: plans,
      exams: exams,
      summary: {
        plans: plans.length,
        tasks: taskCount,
        exams: exams.length,
        questions: questionCount,
        conflicts: conflicts.length,
      },
      errors: errors,
      warnings: warnings,
      conflicts: conflicts,
    };
  }

  function preview(body) {
    return {
      value: normalizeImportPayload(body.data || body, body.studentId || ""),
    };
  }

  function commit(body) {
    var normalized = normalizeImportPayload(body.data || {}, body.studentId || "");
    if (normalized.errors.length) {
      return {
        error: {
          status: 400,
          code: "IMPORT_VALIDATION",
          message: "JSON import validation failed.",
          details: normalized.errors,
        },
      };
    }
    return {
      value: {
        normalized: normalized,
        options: {
          replaceExistingPlans: !!body.replaceExistingPlans,
          replaceExistingExams: !!body.replaceExistingExams,
          skipExistingPlans: !!body.skipExistingPlans,
          skipExistingExams: !!body.skipExistingExams,
          publishImported: !!body.publishImported,
          sourceName: str(body.sourceName, 200),
        },
      },
    };
  }

  return {
    preview: preview,
    commit: commit,
  };
}

module.exports = createImportsValidation;
