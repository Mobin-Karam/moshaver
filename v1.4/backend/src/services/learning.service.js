"use strict";

function createLearningService(deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var todayIso = deps.todayIso;

  function addDays(date, days) {
    var d = new Date(String(date || todayIso()) + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function map(row) {
    if (!row) return null;
    return {
      id: row.id,
      studentId: row.student_id,
      sourceAnswerId: row.source_answer_id || null,
      subject: row.subject || "",
      book: row.book || "",
      chapter: row.chapter || "",
      lesson: row.lesson || "",
      topic: row.topic || "",
      title: row.title || "",
      note: row.note || "",
      hint: row.hint || "",
      dueDate: row.due_date,
      intervalDays: Number(row.interval_days || 1),
      reviewCount: Number(row.review_count || 0),
      mastery: Number(row.mastery || 0),
      status: row.status,
      completedAt: row.completed_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function create(studentId, body) {
    var title = str(body.title, 2000);
    if (!title) {
      return { error: { status: 400, code: "VALIDATION", message: "عنوان مورد یادگیری لازم است." } };
    }
    var sourceAnswerId = str(body.sourceAnswerId, 120) || null;
    if (sourceAnswerId) {
      var ownedAnswer = db.prepare(`SELECT qa.id FROM quiz_answers qa JOIN quiz_attempts a ON a.id=qa.attempt_id WHERE qa.id=? AND a.student_id=?`).get(sourceAnswerId, studentId);
      if (!ownedAnswer) return { error: { status: 404, code: "SOURCE_NOT_FOUND", message: "پاسخ آزمون برای این دانش‌آموز پیدا نشد." } };
      var existing = db.prepare("SELECT * FROM learning_items WHERE student_id=? AND source_answer_id=?").get(studentId, sourceAnswerId);
      if (existing) return { data: map(existing), status: 200 };
    }
    var timestamp = now();
    var id = security.id("learn");
    var dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || "")) ? String(body.dueDate) : todayIso();
    db.prepare(
      `INSERT INTO learning_items (id,student_id,source_answer_id,subject,book,chapter,lesson,topic,title,note,hint,due_date,interval_days,review_count,mastery,status,completed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,'pending',NULL,?,?)`,
    ).run(
      id,
      studentId,
      sourceAnswerId,
      str(body.subject, 160),
      str(body.book, 200),
      str(body.chapter, 200),
      str(body.lesson, 200),
      str(body.topic, 240),
      title,
      str(body.note, 3000),
      str(body.hint, 3000),
      dueDate,
      Math.min(90, Math.max(1, num(body.intervalDays, 1))),
      Math.min(5, Math.max(0, num(body.mastery, 0))),
      timestamp,
      timestamp,
    );
    return { data: map(db.prepare("SELECT * FROM learning_items WHERE id=?").get(id)), status: 201 };
  }

  function ensureFromWrongAnswer(studentId, answerId, question, quiz) {
    var existing = db.prepare("SELECT * FROM learning_items WHERE student_id=? AND source_answer_id=?").get(studentId, answerId);
    if (existing) return map(existing);
    var timestamp = now();
    var id = security.id("learn");
    db.prepare(
      `INSERT INTO learning_items (id,student_id,source_answer_id,subject,book,chapter,lesson,topic,title,note,hint,due_date,interval_days,review_count,mastery,status,completed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,'',?,?,1,0,0,'pending',NULL,?,?)`,
    ).run(
      id,
      studentId,
      answerId,
      str(quiz && quiz.subject, 160),
      str(question.book, 200),
      str(question.chapter, 200),
      str(question.lesson, 200),
      str(question.topic, 240),
      str(question.question_text, 2000) || "مرور سؤال آزمون",
      str(question.hint, 3000),
      addDays(todayIso(), 1),
      timestamp,
      timestamp,
    );
    return map(db.prepare("SELECT * FROM learning_items WHERE id=?").get(id));
  }

  function list(studentId, options) {
    options = options || {};
    var status = str(options.status, 30);
    var dueOnly = String(options.dueOnly || "") === "1" || options.dueOnly === true;
    var limit = Math.min(300, Math.max(1, num(options.limit, 100)));
    var sql = "SELECT * FROM learning_items WHERE student_id=?";
    var args = [studentId];
    if (["pending", "done", "archived"].indexOf(status) >= 0) {
      sql += " AND status=?";
      args.push(status);
    }
    if (dueOnly) {
      sql += " AND status='pending' AND due_date<=?";
      args.push(todayIso());
    }
    sql += " ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,due_date,updated_at DESC LIMIT ?";
    args.push(limit);
    var stmt = db.prepare(sql);
    return stmt.all.apply(stmt, args).map(map);
  }

  function update(studentId, id, body) {
    var row = db.prepare("SELECT * FROM learning_items WHERE id=? AND student_id=?").get(id, studentId);
    if (!row) return { error: { status: 404, code: "NOT_FOUND", message: "مورد یادگیری پیدا نشد." } };
    var fields = {
      subject: ["subject", 160],
      book: ["book", 200],
      chapter: ["chapter", 200],
      lesson: ["lesson", 200],
      topic: ["topic", 240],
      title: ["title", 2000],
      note: ["note", 3000],
      hint: ["hint", 3000],
    };
    var timestamp = now();
    Object.keys(fields).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) return;
      var spec = fields[key];
      db.prepare("UPDATE learning_items SET " + spec[0] + "=?,updated_at=? WHERE id=? AND student_id=?")
        .run(str(body[key], spec[1]), timestamp, id, studentId);
    });
    if (Object.prototype.hasOwnProperty.call(body, "dueDate") && /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || ""))) {
      db.prepare("UPDATE learning_items SET due_date=?,updated_at=? WHERE id=? AND student_id=?")
        .run(String(body.dueDate), timestamp, id, studentId);
    }
    if (Object.prototype.hasOwnProperty.call(body, "mastery")) {
      db.prepare("UPDATE learning_items SET mastery=?,updated_at=? WHERE id=? AND student_id=?")
        .run(Math.min(5, Math.max(0, num(body.mastery, row.mastery))), timestamp, id, studentId);
    }
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      var status = ["pending", "done", "archived"].indexOf(body.status) >= 0 ? body.status : row.status;
      db.prepare("UPDATE learning_items SET status=?,completed_at=?,updated_at=? WHERE id=? AND student_id=?")
        .run(status, status === "done" ? timestamp : null, timestamp, id, studentId);
    }
    return { data: map(db.prepare("SELECT * FROM learning_items WHERE id=?").get(id)) };
  }

  function complete(studentId, id, body) {
    var row = db.prepare("SELECT * FROM learning_items WHERE id=? AND student_id=?").get(id, studentId);
    if (!row) return { error: { status: 404, code: "NOT_FOUND", message: "مورد یادگیری پیدا نشد." } };
    var rating = Math.min(5, Math.max(0, num(body.mastery, row.mastery || 0)));
    var current = Math.max(1, Number(row.interval_days || 1));
    var nextInterval;
    if (rating <= 1) nextInterval = 1;
    else if (rating === 2) nextInterval = Math.max(2, current);
    else if (rating === 3) nextInterval = Math.max(3, Math.round(current * 1.8));
    else if (rating === 4) nextInterval = Math.max(7, Math.round(current * 2.4));
    else nextInterval = Math.max(14, Math.round(current * 3));
    nextInterval = Math.min(90, nextInterval);
    var timestamp = now();
    var archive = body.archive === true || rating >= 5 && Number(row.review_count || 0) >= 3;
    var nextReviewAt = addDays(todayIso(), nextInterval);
    db.exec("BEGIN");
    try {
      db.prepare(
        "UPDATE learning_items SET mastery=?,review_count=review_count+1,interval_days=?,due_date=?,status=?,completed_at=?,updated_at=? WHERE id=? AND student_id=?",
      ).run(rating, nextInterval, nextReviewAt, archive ? "archived" : "pending", archive ? timestamp : null, timestamp, id, studentId);
      db.prepare(`INSERT INTO learning_item_reviews
        (id,learning_item_id,student_id,reviewed_at,rating,previous_mastery,new_mastery,previous_interval_days,next_interval_days,next_review_at,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
          security.id("learning-review"), id, studentId, timestamp, rating,
          Number(row.mastery || 0), rating, current, nextInterval, nextReviewAt, timestamp,
        );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { data: map(db.prepare("SELECT * FROM learning_items WHERE id=?").get(id)) };
  }

  function reviewHistory(studentId, itemId, limit) {
    var n = Math.min(100, Math.max(1, num(limit, 30)));
    if (!db.prepare("SELECT id FROM learning_items WHERE id=? AND student_id=?").get(itemId, studentId)) return null;
    return db.prepare(`SELECT id,reviewed_at AS reviewedAt,rating,previous_mastery AS previousMastery,
      new_mastery AS newMastery,previous_interval_days AS previousIntervalDays,
      next_interval_days AS nextIntervalDays,next_review_at AS nextReviewAt
      FROM learning_item_reviews WHERE learning_item_id=? AND student_id=? ORDER BY reviewed_at DESC LIMIT ?`).all(itemId, studentId, n);
  }

  function remove(studentId, id) {
    var result = db.prepare("DELETE FROM learning_items WHERE id=? AND student_id=?").run(id, studentId);
    if (!result.changes) return { error: { status: 404, code: "NOT_FOUND", message: "مورد یادگیری پیدا نشد." } };
    return { data: { deleted: true } };
  }

  function summary(studentId) {
    var counts = db.prepare(
      `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status='pending' AND due_date<=? THEN 1 ELSE 0 END) AS due,
       AVG(CASE WHEN status!='archived' THEN mastery END) AS avgMastery
       FROM learning_items WHERE student_id=?`,
    ).get(todayIso(), studentId);
    var subjects = db.prepare(
      `SELECT COALESCE(NULLIF(subject,''),'بدون درس') AS subject,
       COUNT(*) AS items,
       SUM(CASE WHEN status='pending' AND due_date<=? THEN 1 ELSE 0 END) AS due,
       ROUND(AVG(mastery),1) AS mastery
       FROM learning_items WHERE student_id=? AND status!='archived'
       GROUP BY COALESCE(NULLIF(subject,''),'بدون درس') ORDER BY due DESC,items DESC LIMIT 12`,
    ).all(todayIso(), studentId);
    var mistakes = db.prepare(
      `SELECT q.subject,qa.error_reason AS reason,COUNT(*) AS count
       FROM quiz_answers qa JOIN quiz_attempts a ON a.id=qa.attempt_id JOIN quizzes q ON q.id=a.quiz_id
       WHERE a.student_id=? AND qa.is_correct=0
       GROUP BY q.subject,qa.error_reason ORDER BY count DESC LIMIT 12`,
    ).all(studentId);
    var attempts = db.prepare(
      `SELECT COUNT(*) AS attempts,ROUND(AVG(percent),1) AS avgPercent,MAX(submitted_at) AS lastAttemptAt
       FROM quiz_attempts WHERE student_id=?`,
    ).get(studentId);
    return {
      totalItems: Number(counts.total || 0),
      pendingItems: Number(counts.pending || 0),
      dueItems: Number(counts.due || 0),
      averageMastery: Number(counts.avgMastery || 0),
      attempts: Number(attempts.attempts || 0),
      averageExamPercent: Number(attempts.avgPercent || 0),
      lastAttemptAt: attempts.lastAttemptAt || null,
      subjects: subjects.map(function (row) { return { subject: row.subject, items: Number(row.items || 0), due: Number(row.due || 0), mastery: Number(row.mastery || 0) }; }),
      mistakePatterns: mistakes.map(function (row) { return { subject: row.subject || "", reason: row.reason || "دسته‌بندی نشده", count: Number(row.count || 0) }; }),
    };
  }

  return {
    create: create,
    ensureFromWrongAnswer: ensureFromWrongAnswer,
    list: list,
    update: update,
    complete: complete,
    remove: remove,
    summary: summary,
    reviewHistory: reviewHistory,
  };
}

module.exports = createLearningService;
