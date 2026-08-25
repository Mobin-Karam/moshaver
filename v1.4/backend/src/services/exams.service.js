"use strict";

function createExamsService(deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var boolInt = deps.boolInt;
  var isoDateValid = deps.isoDateValid;
  var todayIso = deps.todayIso;
  var scheduleReviews = deps.scheduleReviews;
  var touchPresence = deps.touchPresence;
  var recordActivity = deps.recordActivity;
  var notifyStudent = deps.notifyStudent;
  var learning = deps.learning || null;

  function quizPayload(quiz) {
    var out = {
      id: quiz.id,
      title: quiz.title,
      subject: quiz.subject || "",
      durationMinutes: Number(quiz.duration_minutes || quiz.durationMinutes || 20),
      examId: quiz.exam_id || quiz.examId || null,
    };
    out.questions = db
      .prepare(
        "SELECT id,question_text AS question,option_a,option_b,option_c,option_d,sort_order FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order",
      )
      .all(quiz.id)
      .map(function (question) {
        return {
          id: question.id,
          question: question.question,
          options: [question.option_a, question.option_b, question.option_c, question.option_d],
        };
      });
    return out;
  }

  function createOrResumeQuizRun(quiz, studentId, deviceLabel) {
    var active = db
      .prepare(
        "SELECT * FROM quiz_runs WHERE student_id=? AND quiz_id=? AND status='active' ORDER BY started_at DESC LIMIT 1",
      )
      .get(studentId, quiz.id);
    if (active) {
      return {
        runId: active.id,
        startedAt: active.started_at,
        quiz: quizPayload(quiz),
        resumed: true,
      };
    }
    var runId = security.id("quizrun");
    var timestamp = now();
    db.prepare(
      "INSERT INTO quiz_runs (id,quiz_id,student_id,started_at,submitted_at,status,created_at) VALUES (?,?,?,?,NULL,'active',?)",
    ).run(runId, quiz.id, studentId, timestamp, timestamp);
    touchPresence(studentId, "quiz", null, null, str(deviceLabel, 120));
    recordActivity(studentId, "quiz.started", "quiz", quiz.id, { runId: runId });
    return { runId: runId, startedAt: timestamp, quiz: quizPayload(quiz), resumed: false };
  }

  function dateTimeValid(value) {
    return !!value && !isNaN(new Date(value).getTime());
  }

  function examDefaultOpen(exam) {
    return exam.open_at || exam.iso_date + "T00:00:00+03:30";
  }

  function examDefaultClose(exam) {
    return exam.close_at || exam.iso_date + "T23:59:59+03:30";
  }

  function examQuiz(examId) {
    return (
      db
        .prepare(
          "SELECT q.*,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS question_count FROM quizzes q WHERE q.exam_id=? AND q.active=1 ORDER BY q.created_at LIMIT 1",
        )
        .get(examId) || null
    );
  }

  function examAccess(exam, studentId) {
    var quiz = examQuiz(exam.id);
    var attempts = 0;
    var activeRun = null;
    if (quiz) {
      attempts = Number(
        db
          .prepare("SELECT COUNT(*) AS n FROM quiz_attempts WHERE quiz_id=? AND student_id=?")
          .get(quiz.id, studentId).n || 0,
      );
      activeRun =
        db
          .prepare(
            "SELECT * FROM quiz_runs WHERE quiz_id=? AND student_id=? AND status='active' ORDER BY started_at DESC LIMIT 1",
          )
          .get(quiz.id, studentId) || null;
    }
    var approved = Number(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM exam_attempt_requests WHERE exam_id=? AND student_id=? AND status='approved'",
        )
        .get(exam.id, studentId).n || 0,
    );
    var pending =
      db
        .prepare(
          "SELECT id,message,status,created_at AS createdAt FROM exam_attempt_requests WHERE exam_id=? AND student_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1",
        )
        .get(exam.id, studentId) || null;
    var lastApproved =
      db
        .prepare(
          "SELECT id,resolved_at AS resolvedAt,advisor_note AS advisorNote FROM exam_attempt_requests WHERE exam_id=? AND student_id=? AND status='approved' ORDER BY resolved_at DESC LIMIT 1",
        )
        .get(exam.id, studentId) || null;
    var baseMax = Math.max(1, Number(exam.max_attempts || 1));
    var allowed = baseMax + approved;
    var openAt = examDefaultOpen(exam);
    var closeAt = examDefaultClose(exam);
    var nowMs = Date.now();
    var inWindow = nowMs >= new Date(openAt).getTime() && nowMs <= new Date(closeAt).getTime();
    var retryWindow = false;
    if (attempts >= baseMax && attempts < allowed && lastApproved && lastApproved.resolvedAt) {
      retryWindow = nowMs <= new Date(lastApproved.resolvedAt).getTime() + 24 * 3600000;
    }
    var published = Number(exam.published == null ? 1 : exam.published) === 1;
    var questionCount = quiz ? Number(quiz.question_count || 0) : 0;
    var status = String(exam.status || "upcoming");
    var canStart =
      published &&
      status !== "cancelled" &&
      status !== "completed" &&
      questionCount > 0 &&
      attempts < allowed &&
      (inWindow || retryWindow || !!activeRun);
    var reason = "ready";
    if (!published) reason = "not_published";
    else if (status === "cancelled") reason = "cancelled";
    else if (status === "completed") reason = "completed";
    else if (!quiz || !questionCount) reason = "no_questions";
    else if (activeRun) reason = "resume";
    else if (attempts >= allowed) reason = pending ? "retry_pending" : "attempt_limit";
    else if (!inWindow && !retryWindow) reason = nowMs < new Date(openAt).getTime() ? "not_open" : "closed";
    return {
      quiz: quiz,
      questionCount: questionCount,
      attemptsUsed: attempts,
      maxAttempts: baseMax,
      approvedExtraAttempts: approved,
      allowedAttempts: allowed,
      activeRun: activeRun,
      openAt: openAt,
      closeAt: closeAt,
      inWindow: inWindow,
      retryWindow: retryWindow,
      canStart: canStart,
      reason: reason,
      retryRequest: pending,
      lastApproved: lastApproved,
    };
  }

  function mapExam(exam, studentId, adminMode) {
    var access = studentId ? examAccess(exam, studentId) : null;
    var item = {
      id: exam.id,
      title: exam.title,
      persianDate: exam.persian_date,
      isoDate: exam.iso_date,
      note: exam.note || "",
      status: exam.status,
      studentId: exam.student_id || "",
      openAt: examDefaultOpen(exam),
      closeAt: examDefaultClose(exam),
      durationMinutes: Math.max(1, Number(exam.duration_minutes || 120)),
      maxAttempts: Math.max(1, Number(exam.max_attempts || 1)),
      instructions: exam.instructions || "",
      published: Number(exam.published == null ? 1 : exam.published) === 1,
      syllabus: db
        .prepare(
          "SELECT id,subject_label AS subject,description,required,track FROM exam_syllabus WHERE exam_id=? ORDER BY rowid",
        )
        .all(exam.id),
    };
    if (access) {
      item.readiness = examReadiness(studentId, exam.id);
      item.delivery = {
        questionCount: access.questionCount,
        attemptsUsed: access.attemptsUsed,
        maxAttempts: access.maxAttempts,
        allowedAttempts: access.allowedAttempts,
        canStart: access.canStart,
        reason: access.reason,
        openAt: access.openAt,
        closeAt: access.closeAt,
        retryWindow: access.retryWindow,
        retryRequest: access.retryRequest,
        hasActiveRun: !!access.activeRun,
        quizId: access.quiz ? access.quiz.id : null,
      };
    }
    if (adminMode && access) item.delivery.lastApproved = access.lastApproved;
    return item;
  }

  function getExams(studentId, adminMode) {
    var rows;
    if (studentId) {
      rows = db
        .prepare("SELECT * FROM exams WHERE student_id=? OR student_id IS NULL ORDER BY iso_date,created_at")
        .all(studentId);
    } else {
      rows = db.prepare("SELECT * FROM exams ORDER BY iso_date,created_at").all();
    }
    return rows.map(function (exam) {
      return mapExam(exam, studentId, !!adminMode);
    });
  }

  function syllabusWeight(status) {
    var map = { unread: 0, read: 25, tested: 55, review: 75, mastered: 100 };
    return Object.prototype.hasOwnProperty.call(map, status) ? map[status] : 0;
  }

  function examReadiness(studentId, examId) {
    var rows = db.prepare("SELECT COALESCE(sp.status,'unread') AS status FROM exam_syllabus es LEFT JOIN syllabus_progress sp ON sp.syllabus_id=es.id AND sp.student_id=? WHERE es.exam_id=?").all(studentId, examId);
    if (!rows.length) return 0;
    return Math.round(rows.reduce(function (total, row) { return total + syllabusWeight(row.status); }, 0) / rows.length);
  }

  function getExamProgress(studentId, examId) {
    var exam = db
      .prepare("SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
      .get(examId, studentId);
    if (!exam) return null;
    var rows = db
      .prepare(
        "SELECT es.id,es.subject_label AS subject,es.description,es.required,es.track,COALESCE(sp.status,'unread') AS progress_status,COALESCE(sp.accuracy,0) AS accuracy,COALESCE(sp.note,'') AS progress_note FROM exam_syllabus es LEFT JOIN syllabus_progress sp ON sp.syllabus_id=es.id AND sp.student_id=? WHERE es.exam_id=? ORDER BY es.rowid",
      )
      .all(studentId, examId);
    var total = 0;
    rows.forEach(function (row) {
      total += syllabusWeight(row.progress_status);
    });
    var mapped = mapExam(exam, studentId, false);
    mapped.readiness = rows.length ? Math.round(total / rows.length) : 0;
    mapped.syllabus = rows.map(function (row) {
      return {
        id: row.id,
        subject: row.subject,
        description: row.description,
        required: !!row.required,
        track: row.track || "",
        progress: {
          status: row.progress_status,
          accuracy: row.accuracy || 0,
          note: row.progress_note || "",
        },
      };
    });
    return mapped;
  }

  function studentExamGroup(item) {
    var reason = item && item.delivery ? item.delivery.reason : "";
    if (reason === "ready" || reason === "resume") return "available";
    if (reason === "not_open" || reason === "no_questions" || reason === "not_published") return "upcoming";
    return "finished";
  }

  function studentExams(studentId, options) {
    options = options || {};
    var page = Math.max(1, Number(options.page) || 1);
    var pageSize = Math.min(10, Math.max(1, Number(options.limit) || 10));
    var filter = ["all", "upcoming", "available", "finished"].indexOf(options.filter) >= 0 ? options.filter : "all";
    var search = String(options.search || "").trim().toLowerCase().slice(0, 80);
    var items = getExams(studentId, false).filter(function (item) {
      if (filter !== "all" && studentExamGroup(item) !== filter) return false;
      if (!search) return true;
      var syllabus = (item.syllabus || []).map(function (row) { return row.subject + " " + row.description; }).join(" ");
      return (item.title + " " + item.note + " " + item.instructions + " " + syllabus).toLowerCase().indexOf(search) >= 0;
    });
    items.sort(function (a, b) {
      var order = { available: 0, upcoming: 1, finished: 2 };
      var ag = studentExamGroup(a), bg = studentExamGroup(b);
      if (order[ag] !== order[bg]) return order[ag] - order[bg];
      var dateOrder = String(a.openAt || a.isoDate).localeCompare(String(b.openAt || b.isoDate));
      return ag === "finished" ? -dateOrder : dateOrder;
    });
    var total = items.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    var start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page: page,
      pageSize: pageSize,
      total: total,
      totalPages: totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      filter: filter,
      search: search,
    };
  }

  function studentProgress(studentId, examId) {
    var data = getExamProgress(studentId, examId);
    if (!data) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    return { data: data };
  }

  function startStudentExam(studentId, examId, body) {
    var exam = db
      .prepare("SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
      .get(examId, studentId);
    if (!exam) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var access = examAccess(exam, studentId);
    if (!access.quiz || !access.questionCount) {
      return {
        error: {
          status: 409,
          code: "EXAM_NOT_READY",
          message: "سؤال‌های آزمون هنوز توسط مشاور آماده نشده است.",
        },
      };
    }
    if (!access.canStart) {
      var messages = {
        not_published: "آزمون هنوز برای شما منتشر نشده است.",
        cancelled: "این آزمون لغو شده است.",
        completed: "این آزمون بسته شده است.",
        not_open: "زمان شروع آزمون هنوز نرسیده است.",
        closed: "زمان آزمون تمام شده است.",
        attempt_limit: "این آزمون فقط یک‌بار قابل انجام است. برای تلاش مجدد درخواست بفرستید.",
        retry_pending: "درخواست تلاش مجدد در انتظار بررسی مشاور است.",
      };
      return {
        error: {
          status: 409,
          code: "EXAM_UNAVAILABLE",
          message: messages[access.reason] || "آزمون در حال حاضر قابل اجرا نیست.",
          details: {
            reason: access.reason,
            openAt: access.openAt,
            closeAt: access.closeAt,
            attemptsUsed: access.attemptsUsed,
            allowedAttempts: access.allowedAttempts,
          },
        },
      };
    }
    var run = createOrResumeQuizRun(access.quiz, studentId, body.deviceLabel);
    run.exam = {
      id: exam.id,
      title: exam.title,
      openAt: access.openAt,
      closeAt: access.closeAt,
      attemptsUsed: access.attemptsUsed,
      allowedAttempts: access.allowedAttempts,
      retryWindow: access.retryWindow,
    };
    return { data: run, status: run.resumed ? 200 : 201 };
  }

  function requestStudentRetry(studentId, examId, body) {
    var exam = db
      .prepare("SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
      .get(examId, studentId);
    if (!exam) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var access = examAccess(exam, studentId);
    if (access.attemptsUsed < access.allowedAttempts) {
      return {
        error: {
          status: 409,
          code: "RETRY_NOT_NEEDED",
          message: "هنوز یک تلاش مجاز برای این آزمون دارید.",
        },
      };
    }
    if (access.retryRequest) {
      return {
        error: {
          status: 409,
          code: "RETRY_PENDING",
          message: "یک درخواست تلاش مجدد از قبل در انتظار بررسی است.",
        },
      };
    }
    var requestId = security.id("examretry");
    var timestamp = now();
    var message = str(body.message, 1200);
    db.prepare(
      "INSERT INTO exam_attempt_requests (id,exam_id,student_id,message,status,advisor_note,created_at,updated_at) VALUES (?,?,?,?,'pending','',?,?)",
    ).run(requestId, exam.id, studentId, message, timestamp, timestamp);
    recordActivity(studentId, "exam.retry_requested", "exam", exam.id, {
      requestId: requestId,
    });
    return {
      data: {
        id: requestId,
        status: "pending",
        examId: exam.id,
        title: exam.title,
        message: message,
      },
      status: 201,
    };
  }

  function startStudentQuiz(studentId, quizId, body) {
    var quiz = db.prepare("SELECT * FROM quizzes WHERE id=? AND active=1").get(quizId);
    if (!quiz) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    if (quiz.exam_id) {
      var exam = db
        .prepare("SELECT * FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
        .get(quiz.exam_id, studentId);
      if (!exam) {
        return { error: { status: 404, code: "NOT_FOUND", message: "آزمون اصلی پیدا نشد." } };
      }
      var access = examAccess(exam, studentId);
      if (!access.canStart) {
        return {
          error: {
            status: 409,
            code: "EXAM_UNAVAILABLE",
            message: "این آزمون در حال حاضر قابل اجرا نیست.",
            details: { reason: access.reason },
          },
        };
      }
    }
    var run = createOrResumeQuizRun(quiz, studentId, body.deviceLabel);
    return { data: run, status: run.resumed ? 200 : 201 };
  }

  function studentQuiz(quizId) {
    var quiz = db
      .prepare("SELECT * FROM quizzes WHERE id=? AND active=1")
      .get(quizId);
    if (!quiz) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    return { data: quizPayload(quiz) };
  }

  function submitStudentQuizAttempt(studentId, quizId, body) {
    var quiz = db.prepare("SELECT * FROM quizzes WHERE id=? AND active=1").get(quizId);
    if (!quiz) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var questions = db
      .prepare("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order")
      .all(quiz.id);
    var incoming = Array.isArray(body.answers) ? body.answers : [];
    var answerMap = {};
    incoming.forEach(function (answer) {
      answerMap[answer.questionId] = answer;
    });
    var runId = str(body.runId, 120);
    var run = db
      .prepare("SELECT * FROM quiz_runs WHERE id=? AND quiz_id=? AND student_id=? AND status='active'")
      .get(runId, quiz.id, studentId);
    if (!run) {
      return {
        error: {
          status: 409,
          code: "QUIZ_RUN",
          message: "جلسه آزمون معتبر نیست؛ آزمون را دوباره شروع کنید.",
        },
      };
    }
    var correct = 0;
    var wrong = 0;
    var blank = 0;
    var attemptId = security.id("attempt");
    var timestamp = now();
    var duration = Math.max(0, Math.round((new Date(timestamp) - new Date(run.started_at)) / 1000));
    db.exec("BEGIN");
    try {
      db.prepare(
        "INSERT INTO quiz_attempts (id,quiz_id,student_id,started_at,submitted_at,correct,wrong,blank,percent,duration_seconds) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).run(attemptId, quiz.id, studentId, run.started_at, timestamp, 0, 0, 0, 0, duration);
      var insertAnswer = db.prepare(
        "INSERT INTO quiz_answers (id,attempt_id,question_id,selected_option,is_correct,error_reason) VALUES (?,?,?,?,?,?)",
      );
      questions.forEach(function (question) {
        var answer = answerMap[question.id] || {};
        var selected =
          ["a", "b", "c", "d"].indexOf(answer.selectedOption) >= 0
            ? answer.selectedOption
            : null;
        var isCorrect = selected && selected === question.correct_option ? 1 : 0;
        if (!selected) blank++;
        else if (isCorrect) correct++;
        else wrong++;
        var answerId = security.id("answer");
        insertAnswer.run(
          answerId,
          attemptId,
          question.id,
          selected,
          isCorrect,
          str(answer.errorReason, 100),
        );
        if (!isCorrect && learning) {
          learning.ensureFromWrongAnswer(studentId, answerId, question, quiz);
        }
      });
      var total = questions.length;
      var percent = total ? Math.round((correct * 100) / total) : 0;
      db.prepare("UPDATE quiz_attempts SET correct=?,wrong=?,blank=?,percent=? WHERE id=?").run(
        correct,
        wrong,
        blank,
        percent,
        attemptId,
      );
      db.prepare("UPDATE quiz_runs SET status='submitted',submitted_at=? WHERE id=?").run(
        timestamp,
        run.id,
      );
      if (quiz.exam_id) {
        var linkedTasks = db
          .prepare("SELECT t.id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.exam_id=? AND p.student_id=?")
          .all(quiz.exam_id, studentId);
        linkedTasks.forEach(function (linkedTask) {
          db.prepare(
            "INSERT INTO task_completions (id,task_id,student_id,status,actual_minutes,actual_tests,note,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(task_id,student_id) DO UPDATE SET status='done',actual_minutes=excluded.actual_minutes,actual_tests=excluded.actual_tests,note=excluded.note,updated_at=excluded.updated_at",
          ).run(
            security.id("completion"),
            linkedTask.id,
            studentId,
            "done",
            Math.max(1, Math.round(duration / 60)),
            questions.length,
            "آزمون در Moshaver ثبت شد.",
            timestamp,
          );
        });
      }
      db.exec("COMMIT");
      var review = db
        .prepare(
          "SELECT qa.id AS answerId,qa.question_id AS questionId,qq.question_text AS question,qa.selected_option AS selectedOption,qq.correct_option AS correctOption,qq.explanation,qq.book,qq.chapter,qq.lesson,qq.topic,qq.hint,qa.is_correct AS isCorrect,qa.error_reason AS errorReason FROM quiz_answers qa JOIN quiz_questions qq ON qq.id=qa.question_id WHERE qa.attempt_id=? ORDER BY qq.sort_order",
        )
        .all(attemptId);
      touchPresence(studentId, "online", null, null, "");
      recordActivity(studentId, "quiz.completed", "quiz", quiz.id, {
        attemptId: attemptId,
        percent: percent,
        correct: correct,
        wrong: wrong,
        blank: blank,
        durationSeconds: duration,
      });
      return {
        data: {
          attemptId: attemptId,
          correct: correct,
          wrong: wrong,
          blank: blank,
          percent: percent,
          total: total,
          durationSeconds: duration,
          review: review,
        },
        status: 201,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function studentMistakes(studentId, limit) {
    var n = Math.min(200, Math.max(1, Number(limit || 80)));
    return db
      .prepare(
        "SELECT qa.id,qa.attempt_id AS attemptId,qa.question_id AS questionId,qa.selected_option AS selectedOption, qa.error_reason AS errorReason,qq.correct_option AS correctOption,qq.question_text AS question,qq.explanation, q.title AS quizTitle,q.subject,att.submitted_at AS submittedAt FROM quiz_answers qa JOIN quiz_attempts att ON att.id=qa.attempt_id JOIN quiz_questions qq ON qq.id=qa.question_id JOIN quizzes q ON q.id=att.quiz_id WHERE att.student_id=? AND qa.is_correct=0 ORDER BY att.submitted_at DESC LIMIT ?",
      )
      .all(studentId, n);
  }

  function updateStudentMistake(studentId, mistakeId, body) {
    var answer = db
      .prepare(
        "SELECT qa.id FROM quiz_answers qa JOIN quiz_attempts att ON att.id=qa.attempt_id WHERE qa.id=? AND att.student_id=?",
      )
      .get(mistakeId, studentId);
    if (!answer) {
      return { error: { status: 404, code: "NOT_FOUND", message: "اشتباه پیدا نشد." } };
    }
    var errorReason = str(body.errorReason, 100);
    db.prepare("UPDATE quiz_answers SET error_reason=? WHERE id=?").run(errorReason, answer.id);
    return { data: { id: answer.id, errorReason: errorReason } };
  }

  function studentQuizHistory(studentId) {
    return db
      .prepare(
        `SELECT qa.id,qa.quiz_id AS quizId,q.title,q.subject,q.exam_id AS examId,
        qa.correct,qa.wrong,qa.blank,qa.percent,qa.duration_seconds AS durationSeconds,qa.started_at AS startedAt,qa.submitted_at AS submittedAt,
        (SELECT COUNT(*) FROM quiz_answers ans WHERE ans.attempt_id=qa.id) AS totalQuestions
        FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE qa.student_id=? ORDER BY qa.submitted_at DESC LIMIT 100`,
      )
      .all(studentId);
  }

  function attemptDetail(studentId, attemptId) {
    var attempt = db.prepare(
      `SELECT a.id,a.quiz_id AS quizId,q.title,q.subject,q.exam_id AS examId,e.title AS examTitle,
       a.correct,a.wrong,a.blank,a.percent,a.duration_seconds AS durationSeconds,a.started_at AS startedAt,a.submitted_at AS submittedAt
       FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id LEFT JOIN exams e ON e.id=q.exam_id
       WHERE a.id=? AND a.student_id=?`,
    ).get(attemptId, studentId);
    if (!attempt) return { error: { status: 404, code: "NOT_FOUND", message: "سابقه آزمون پیدا نشد." } };
    attempt.answers = db.prepare(
      `SELECT qa.id AS answerId,qa.question_id AS questionId,qa.selected_option AS selectedOption,qa.is_correct AS isCorrect,qa.error_reason AS errorReason,
       qq.question_text AS question,qq.option_a AS optionA,qq.option_b AS optionB,qq.option_c AS optionC,qq.option_d AS optionD,qq.correct_option AS correctOption,qq.explanation,
       qq.book,qq.chapter,qq.lesson,qq.topic,qq.hint,
       li.id AS learningItemId,li.note AS learningNote,li.hint AS learningHint,li.due_date AS learningDueDate,li.status AS learningStatus,li.mastery AS learningMastery
       FROM quiz_answers qa JOIN quiz_questions qq ON qq.id=qa.question_id
       LEFT JOIN learning_items li ON li.student_id=? AND li.source_answer_id=qa.id
       WHERE qa.attempt_id=? ORDER BY qq.sort_order`,
    ).all(studentId, attemptId);
    return { data: attempt };
  }

  function adminStudentQuizHistory(studentId) {
    return studentQuizHistory(studentId);
  }

  function adminAttemptDetail(studentId, attemptId) {
    return attemptDetail(studentId, attemptId);
  }

  function adminExams(studentId) {
    return getExams(studentId, true);
  }

  function createAdminExam(body) {
    var title = str(body.title, 200);
    var iso = str(body.isoDate, 10);
    var persianDate = str(body.persianDate, 100);
    var studentId = str(body.studentId, 120);
    if (!title || !isoDateValid(iso) || !persianDate || !studentId) {
      return {
        error: {
          status: 400,
          code: "VALIDATION",
          message: "دانش‌آموز، عنوان، تاریخ شمسی و تاریخ ISO لازم است.",
        },
      };
    }
    if (!db.prepare("SELECT id FROM students WHERE id=?").get(studentId)) {
      return { error: { status: 404, code: "NOT_FOUND", message: "دانش‌آموز پیدا نشد." } };
    }
    var openAt = str(body.openAt, 80) || iso + "T08:00:00+03:30";
    var closeAt = str(body.closeAt, 80) || iso + "T13:00:00+03:30";
    if (!dateTimeValid(openAt) || !dateTimeValid(closeAt) || new Date(closeAt) <= new Date(openAt)) {
      return { error: { status: 400, code: "VALIDATION", message: "بازه زمانی آزمون معتبر نیست." } };
    }
    var examId = security.id("exam");
    var timestamp = now();
    var duration = Math.max(1, num(body.durationMinutes, 120));
    db.prepare(
      "INSERT INTO exams (id,title,persian_date,iso_date,note,status,created_at,updated_at,student_id,open_at,close_at,duration_minutes,max_attempts,instructions,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      examId,
      title,
      persianDate,
      iso,
      str(body.note, 1000),
      str(body.status, 30) || "upcoming",
      timestamp,
      timestamp,
      studentId,
      openAt,
      closeAt,
      duration,
      1,
      str(body.instructions, 3000),
      body.published === false ? 0 : 1,
    );
    db.prepare(
      "INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
    ).run(security.id("quiz"), title, "آزمون اصلی", duration, examId, timestamp, timestamp);
    return {
      data: mapExam(db.prepare("SELECT * FROM exams WHERE id=?").get(examId), studentId, true),
      audit: { resourceId: examId },
      status: 201,
    };
  }

  function updateAdminExam(examId, body) {
    var exam = db.prepare("SELECT * FROM exams WHERE id=?").get(examId);
    if (!exam) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var title = Object.prototype.hasOwnProperty.call(body, "title") ? str(body.title, 200) : exam.title;
    var persianDate = Object.prototype.hasOwnProperty.call(body, "persianDate")
      ? str(body.persianDate, 100)
      : exam.persian_date;
    var iso = Object.prototype.hasOwnProperty.call(body, "isoDate") ? str(body.isoDate, 10) : exam.iso_date;
    var studentId = Object.prototype.hasOwnProperty.call(body, "studentId")
      ? str(body.studentId, 120)
      : exam.student_id || "";
    var openAt = Object.prototype.hasOwnProperty.call(body, "openAt")
      ? str(body.openAt, 80)
      : examDefaultOpen(exam);
    var closeAt = Object.prototype.hasOwnProperty.call(body, "closeAt")
      ? str(body.closeAt, 80)
      : examDefaultClose(exam);
    if (!title || !persianDate || !isoDateValid(iso) || !studentId) {
      return {
        error: {
          status: 400,
          code: "VALIDATION",
          message: "دانش‌آموز، عنوان، تاریخ شمسی و تاریخ ISO لازم است.",
        },
      };
    }
    if (!db.prepare("SELECT id FROM students WHERE id=?").get(studentId)) {
      return { error: { status: 404, code: "NOT_FOUND", message: "دانش‌آموز پیدا نشد." } };
    }
    if (!dateTimeValid(openAt) || !dateTimeValid(closeAt) || new Date(closeAt) <= new Date(openAt)) {
      return { error: { status: 400, code: "VALIDATION", message: "بازه زمانی آزمون معتبر نیست." } };
    }
    var duration = Object.prototype.hasOwnProperty.call(body, "durationMinutes")
      ? Math.max(1, num(body.durationMinutes, 120))
      : Math.max(1, Number(exam.duration_minutes || 120));
    var published = Object.prototype.hasOwnProperty.call(body, "published")
      ? boolInt(body.published)
      : Number(exam.published == null ? 1 : exam.published);
    var note = Object.prototype.hasOwnProperty.call(body, "note") ? str(body.note, 1000) : exam.note || "";
    var status = Object.prototype.hasOwnProperty.call(body, "status")
      ? str(body.status, 30)
      : exam.status || "upcoming";
    var instructions = Object.prototype.hasOwnProperty.call(body, "instructions")
      ? str(body.instructions, 3000)
      : exam.instructions || "";
    var timestamp = now();
    db.prepare(
      "UPDATE exams SET title=?,persian_date=?,iso_date=?,note=?,status=?,student_id=?,open_at=?,close_at=?,duration_minutes=?,max_attempts=1,instructions=?,published=?,updated_at=? WHERE id=?",
    ).run(
      title,
      persianDate,
      iso,
      note,
      status,
      studentId,
      openAt,
      closeAt,
      duration,
      instructions,
      published,
      timestamp,
      exam.id,
    );
    var quiz = examQuiz(exam.id);
    if (quiz) {
      db.prepare("UPDATE quizzes SET title=?,duration_minutes=?,updated_at=? WHERE id=?").run(
        title,
        duration,
        timestamp,
        quiz.id,
      );
    }
    return {
      data: mapExam(db.prepare("SELECT * FROM exams WHERE id=?").get(exam.id), studentId, true),
      audit: { resourceId: exam.id },
    };
  }

  function deleteAdminExam(examId) {
    var result = db.prepare("DELETE FROM exams WHERE id=?").run(examId);
    if (!result.changes) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    return { data: { deleted: true } };
  }

  function createAdminExamSyllabus(examId, body) {
    var exam = db.prepare("SELECT * FROM exams WHERE id=?").get(examId);
    if (!exam) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var subject = str(body.subject, 150);
    var description = str(body.description, 1000);
    if (!subject || !description) {
      return { error: { status: 400, code: "VALIDATION", message: "درس و توضیح بودجه لازم است." } };
    }
    var syllabusId = security.id("syllabus");
    db.prepare(
      "INSERT INTO exam_syllabus (id,exam_id,subject_label,description,required,track) VALUES (?,?,?,?,?,?)",
    ).run(syllabusId, exam.id, subject, description, boolInt(body.required), str(body.track, 100));
    return {
      data: mapExam(db.prepare("SELECT * FROM exams WHERE id=?").get(exam.id), exam.student_id || "", true),
      audit: { resourceId: syllabusId },
      status: 201,
    };
  }

  function deleteAdminSyllabus(syllabusId) {
    db.prepare("DELETE FROM exam_syllabus WHERE id=?").run(syllabusId);
    return { data: { deleted: true } };
  }

  function adminExamQuestions(examId) {
    var quiz = examQuiz(examId);
    if (!quiz) return [];
    return db.prepare("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order").all(quiz.id);
  }

  function createAdminExamQuestion(examId, body) {
    var exam = db.prepare("SELECT * FROM exams WHERE id=?").get(examId);
    if (!exam) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var quiz = examQuiz(exam.id);
    if (!quiz) {
      var quizId = security.id("quiz");
      var timestamp = now();
      db.prepare(
        "INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
      ).run(quizId, exam.title, "آزمون اصلی", Math.max(1, num(exam.duration_minutes, 120)), exam.id, timestamp, timestamp);
      quiz = db.prepare("SELECT * FROM quizzes WHERE id=?").get(quizId);
    }
    var options = Array.isArray(body.options) ? body.options : [];
    if (!str(body.question, 2000) || options.length !== 4 || ["a", "b", "c", "d"].indexOf(body.correctOption) < 0) {
      return {
        error: {
          status: 400,
          code: "VALIDATION",
          message: "صورت سؤال، چهار گزینه و پاسخ صحیح لازم است.",
        },
      };
    }
    var questionId = security.id("question");
    db.prepare(
      "INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order,book,chapter,lesson,topic,hint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      questionId,
      quiz.id,
      str(body.question, 2000),
      str(options[0], 1000),
      str(options[1], 1000),
      str(options[2], 1000),
      str(options[3], 1000),
      body.correctOption,
      str(body.explanation, 2000),
      num(body.sortOrder, Number(quiz.question_count || 0) + 1),
      str(body.book, 200),
      str(body.chapter, 200),
      str(body.lesson, 200),
      str(body.topic, 240),
      str(body.hint, 3000),
    );
    return { data: { id: questionId }, audit: { resourceId: questionId, examId: exam.id }, status: 201 };
  }

  function deleteAdminExamQuestion(examId, questionId) {
    var quiz = examQuiz(examId);
    if (!quiz) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمون پیدا نشد." } };
    }
    var result = db.prepare("DELETE FROM quiz_questions WHERE id=? AND quiz_id=?").run(questionId, quiz.id);
    if (!result.changes) {
      return { error: { status: 404, code: "NOT_FOUND", message: "سؤال پیدا نشد." } };
    }
    return { data: { deleted: true } };
  }

  function adminExamAttemptRequests(studentId) {
    var sql =
      "SELECT r.*,e.title AS examTitle,s.name AS studentName FROM exam_attempt_requests r JOIN exams e ON e.id=r.exam_id JOIN students s ON s.id=r.student_id WHERE 1=1";
    var args = [];
    if (studentId) {
      sql += " AND r.student_id=?";
      args.push(studentId);
    }
    sql += " ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100";
    var statement = db.prepare(sql);
    return statement.all.apply(statement, args);
  }

  function reviewExamAttemptRequest(requestId, body, userId) {
    var request = db.prepare("SELECT * FROM exam_attempt_requests WHERE id=?").get(requestId);
    if (!request) {
      return { error: { status: 404, code: "NOT_FOUND", message: "درخواست پیدا نشد." } };
    }
    var status = ["approved", "rejected"].indexOf(body.status) >= 0 ? body.status : null;
    if (!status) {
      return { error: { status: 400, code: "VALIDATION", message: "وضعیت معتبر نیست." } };
    }
    var timestamp = now();
    var advisorNote = str(body.advisorNote, 1200);
    db.prepare(
      "UPDATE exam_attempt_requests SET status=?,advisor_note=?,updated_at=?,resolved_by=?,resolved_at=? WHERE id=?",
    ).run(status, advisorNote, timestamp, userId, timestamp, request.id);
    var exam = db.prepare("SELECT title FROM exams WHERE id=?").get(request.exam_id);
    notifyStudent(
      request.student_id,
      status === "approved" ? "تلاش مجدد آزمون تأیید شد" : "درخواست تلاش مجدد بررسی شد",
      status === "approved"
        ? "برای آزمون «" + (exam ? exam.title : "") + "» یک تلاش اضافه تا ۲۴ ساعت فعال شد."
        : str(body.advisorNote, 1000) || "درخواست شما تأیید نشد.",
      { type: "exam", url: "/exams/" + request.exam_id },
    );
    return {
      data: {
        id: request.id,
        status: status,
        resolvedAt: timestamp,
        studentId: request.student_id,
        examId: request.exam_id,
      },
    };
  }

  function updateStudentSyllabusProgress(studentId, syllabusId, body) {
    if (!db.prepare("SELECT id FROM exam_syllabus WHERE id=?").get(syllabusId)) {
      return { error: { status: 404, code: "NOT_FOUND", message: "بودجه آزمون پیدا نشد." } };
    }
    var status = ["unread", "read", "tested", "review", "mastered"].indexOf(body.status) >= 0 ? body.status : "read";
    var accuracy = Math.min(100, Math.max(0, num(body.accuracy, 0)));
    var timestamp = now();
    db.prepare(
      "INSERT INTO syllabus_progress (student_id,syllabus_id,status,accuracy,note,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,syllabus_id) DO UPDATE SET status=excluded.status,accuracy=excluded.accuracy,note=excluded.note,updated_at=excluded.updated_at",
    ).run(studentId, syllabusId, status, accuracy, str(body.note, 1000), timestamp);
    if (status === "read" || status === "tested") {
      scheduleReviews(studentId, syllabusId, todayIso());
    }
    recordActivity(studentId, "syllabus." + status, "syllabus", syllabusId, { accuracy: accuracy });
    return { data: { syllabusId: syllabusId, status: status, accuracy: accuracy } };
  }

  function adminQuizzes() {
    return db
      .prepare(
        "SELECT q.*,e.title AS exam_title,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS question_count FROM quizzes q LEFT JOIN exams e ON e.id=q.exam_id ORDER BY q.created_at DESC",
      )
      .all();
  }

  function createAdminQuiz(body) {
    var title = str(body.title, 200);
    if (!title) {
      return { error: { status: 400, code: "VALIDATION", message: "عنوان آزمون لازم است." } };
    }
    var quizId = security.id("quiz");
    var timestamp = now();
    db.prepare(
      "INSERT INTO quizzes (id,title,subject,duration_minutes,exam_id,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run(
      quizId,
      title,
      str(body.subject, 150),
      Math.max(1, num(body.durationMinutes, 20)),
      str(body.examId, 100) || null,
      1,
      timestamp,
      timestamp,
    );
    return { data: { id: quizId, title: title } };
  }

  function updateAdminQuiz(quizId, body) {
    var quiz = db.prepare("SELECT * FROM quizzes WHERE id=?").get(quizId);
    if (!quiz) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمونک پیدا نشد." } };
    }
    var map = {
      title: "title",
      subject: "subject",
      durationMinutes: "duration_minutes",
      examId: "exam_id",
      active: "active",
    };
    Object.keys(map).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        var value =
          key === "durationMinutes"
            ? Math.max(1, num(body[key], 20))
            : key === "active"
              ? boolInt(body[key])
              : str(body[key], 200) || null;
        db.prepare("UPDATE quizzes SET " + map[key] + "=?,updated_at=? WHERE id=?").run(
          value,
          now(),
          quiz.id,
        );
      }
    });
    return { data: db.prepare("SELECT * FROM quizzes WHERE id=?").get(quiz.id) };
  }

  function adminQuizQuestions(quizId) {
    return db
      .prepare("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order")
      .all(quizId);
  }

  function createAdminQuizQuestion(quizId, body) {
    if (!db.prepare("SELECT id FROM quizzes WHERE id=?").get(quizId)) {
      return { error: { status: 404, code: "NOT_FOUND", message: "آزمونک پیدا نشد." } };
    }
    var options = body.options || [];
    if (
      !str(body.question, 1000) ||
      options.length < 4 ||
      ["a", "b", "c", "d"].indexOf(body.correctOption) < 0
    ) {
      return {
        error: {
          status: 400,
          code: "VALIDATION",
          message: "سؤال، چهار گزینه و پاسخ صحیح لازم است.",
        },
      };
    }
    var questionId = security.id("question");
    db.prepare(
      "INSERT INTO quiz_questions (id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,sort_order,book,chapter,lesson,topic,hint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      questionId,
      quizId,
      str(body.question, 2000),
      str(options[0], 1000),
      str(options[1], 1000),
      str(options[2], 1000),
      str(options[3], 1000),
      body.correctOption,
      str(body.explanation, 2000),
      num(body.sortOrder, 999),
      str(body.book, 200),
      str(body.chapter, 200),
      str(body.lesson, 200),
      str(body.topic, 240),
      str(body.hint, 3000),
    );
    return { data: { id: questionId } };
  }

  function updateAdminQuestion(questionId, body) {
    var row = db.prepare("SELECT * FROM quiz_questions WHERE id=?").get(questionId);
    if (!row) return { error: { status: 404, code: "NOT_FOUND", message: "سؤال پیدا نشد." } };
    var options = Array.isArray(body.options) ? body.options : [row.option_a, row.option_b, row.option_c, row.option_d];
    var question = Object.prototype.hasOwnProperty.call(body, "question") ? str(body.question, 2000) : row.question_text;
    var correct = Object.prototype.hasOwnProperty.call(body, "correctOption") ? str(body.correctOption, 1) : row.correct_option;
    if (!question || options.length < 4 || ["a", "b", "c", "d"].indexOf(correct) < 0) {
      return { error: { status: 400, code: "VALIDATION", message: "سؤال، چهار گزینه و پاسخ صحیح لازم است." } };
    }
    db.prepare(`UPDATE quiz_questions SET question_text=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_option=?,explanation=?,sort_order=?,book=?,chapter=?,lesson=?,topic=?,hint=? WHERE id=?`).run(
      question, str(options[0],1000), str(options[1],1000), str(options[2],1000), str(options[3],1000), correct,
      Object.prototype.hasOwnProperty.call(body,"explanation") ? str(body.explanation,2000) : row.explanation,
      Object.prototype.hasOwnProperty.call(body,"sortOrder") ? num(body.sortOrder,row.sort_order) : row.sort_order,
      Object.prototype.hasOwnProperty.call(body,"book") ? str(body.book,200) : row.book,
      Object.prototype.hasOwnProperty.call(body,"chapter") ? str(body.chapter,200) : row.chapter,
      Object.prototype.hasOwnProperty.call(body,"lesson") ? str(body.lesson,200) : row.lesson,
      Object.prototype.hasOwnProperty.call(body,"topic") ? str(body.topic,240) : row.topic,
      Object.prototype.hasOwnProperty.call(body,"hint") ? str(body.hint,3000) : row.hint,
      questionId
    );
    return { data: db.prepare("SELECT * FROM quiz_questions WHERE id=?").get(questionId) };
  }

  function deleteAdminQuestion(questionId) {
    db.prepare("DELETE FROM quiz_questions WHERE id=?").run(questionId);
    return { data: { deleted: true } };
  }

  return {
    adminExams: adminExams,
    createAdminExam: createAdminExam,
    updateAdminExam: updateAdminExam,
    deleteAdminExam: deleteAdminExam,
    createAdminExamSyllabus: createAdminExamSyllabus,
    deleteAdminSyllabus: deleteAdminSyllabus,
    adminExamQuestions: adminExamQuestions,
    createAdminExamQuestion: createAdminExamQuestion,
    deleteAdminExamQuestion: deleteAdminExamQuestion,
    adminExamAttemptRequests: adminExamAttemptRequests,
    reviewExamAttemptRequest: reviewExamAttemptRequest,
    examProgress: getExamProgress,
    studentExams: studentExams,
    studentProgress: studentProgress,
    startStudentExam: startStudentExam,
    requestStudentRetry: requestStudentRetry,
    updateStudentSyllabusProgress: updateStudentSyllabusProgress,
    startStudentQuiz: startStudentQuiz,
    studentQuiz: studentQuiz,
    submitStudentQuizAttempt: submitStudentQuizAttempt,
    studentMistakes: studentMistakes,
    updateStudentMistake: updateStudentMistake,
    studentQuizHistory: studentQuizHistory,
    attemptDetail: attemptDetail,
    adminStudentQuizHistory: adminStudentQuizHistory,
    adminAttemptDetail: adminAttemptDetail,
    adminQuizzes: adminQuizzes,
    createAdminQuiz: createAdminQuiz,
    updateAdminQuiz: updateAdminQuiz,
    adminQuizQuestions: adminQuizQuestions,
    createAdminQuizQuestion: createAdminQuizQuestion,
    updateAdminQuestion: updateAdminQuestion,
    deleteAdminQuestion: deleteAdminQuestion,
  };
}

module.exports = createExamsService;
