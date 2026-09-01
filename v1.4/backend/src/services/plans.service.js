"use strict";

function createPlansService(deps) {
  var TASK_TYPES = ["study", "review", "test", "class", "prayer", "meal", "break", "exam"];
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var num = deps.num;
  var boolInt = deps.boolInt;
  var timeValid = deps.timeValid;
  var getSubjects = deps.getSubjects;
  var getReport = deps.getReport;
  var examProgress = deps.examProgress;

  function mapPlan(plan, studentId) {
    if (!plan) return null;
    var tasks = db
      .prepare(
        "SELECT t.*,tc.status AS completion_status,tc.actual_minutes,tc.actual_tests,tc.note AS completion_note FROM tasks t LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=? WHERE t.plan_id=? ORDER BY t.sort_order,t.start_time",
      )
      .all(studentId, plan.id);
    return {
      id: plan.id,
      studentId: plan.student_id,
      planDate: plan.plan_date,
      jalaliId: plan.jalali_id,
      dayLabel: plan.day_label,
      persianDate: plan.persian_date,
      title: plan.title,
      motivationText: plan.motivation_text || "",
      published: !!plan.published,
      tasks: tasks.map(function (task) {
        return {
          id: task.id,
          start: task.start_time,
          end: task.end_time,
          type: task.type,
          subject: task.subject || "",
          title: task.title || "",
          pages: task.pages || "",
          testCount: task.test_count || 0,
          note: task.note || "",
          quizId: task.quiz_id || null,
          examId: task.exam_id || null,
          sortOrder: task.sort_order || 0,
          completion: task.completion_status
            ? {
                status: task.completion_status,
                actualMinutes: task.actual_minutes || 0,
                actualTests: task.actual_tests || 0,
                note: task.completion_note || "",
              }
            : null,
        };
      }),
    };
  }

  function planMetrics(plan) {
    if (!plan) {
      return {
        totalTasks: 0,
        doneTasks: 0,
        partialTasks: 0,
        plannedMinutes: 0,
        actualMinutes: 0,
        plannedTests: 0,
        actualTests: 0,
      };
    }
    var total = plan.tasks.length;
    var done = 0;
    var partial = 0;
    var plannedMinutes = 0;
    var actualMinutes = 0;
    var plannedTests = 0;
    var actualTests = 0;
    plan.tasks.forEach(function (task) {
      var start = String(task.start || "00:00").split(":");
      var end = String(task.end || "00:00").split(":");
      var minutes =
        Number(end[0]) * 60 + Number(end[1]) - (Number(start[0]) * 60 + Number(start[1]));
      if (minutes > 0) plannedMinutes += minutes;
      plannedTests += Number(task.testCount || 0);
      if (task.completion) {
        if (task.completion.status === "done") done++;
        else if (task.completion.status === "partial") partial++;
        actualMinutes += Number(task.completion.actualMinutes || 0);
        actualTests += Number(task.completion.actualTests || 0);
      }
    });
    return {
      totalTasks: total,
      doneTasks: done,
      partialTasks: partial,
      plannedMinutes: plannedMinutes,
      actualMinutes: actualMinutes,
      plannedTests: plannedTests,
      actualTests: actualTests,
    };
  }

  function studentDashboard(studentId, date, includeDraft) {
    var student = db.prepare("SELECT * FROM students WHERE id=?").get(studentId);
    if (!student) return null;
    var sql =
      "SELECT * FROM plans WHERE student_id=? AND plan_date=?" +
      (includeDraft ? "" : " AND published=1") +
      " LIMIT 1";
    var plan = db.prepare(sql).get(studentId, date);
    var mappedPlan = mapPlan(plan, studentId);
    var nextExam = db
      .prepare(
        "SELECT * FROM exams WHERE iso_date>=? AND published=1 AND status<>'cancelled' AND (student_id=? OR student_id IS NULL) ORDER BY iso_date,open_at LIMIT 1",
      )
      .get(date, studentId);
    var recent = db
      .prepare("SELECT * FROM quiz_attempts WHERE student_id=? ORDER BY submitted_at DESC LIMIT 6")
      .all(studentId);
    return {
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        major: student.major,
        targetMajor: student.target_major,
        targetCity: student.target_city,
        rankGoal: student.rank_goal,
        dailyCapacity: student.daily_capacity,
      },
      plan: mappedPlan,
      planMetrics: planMetrics(mappedPlan),
      subjects: getSubjects(studentId),
      nextExam: nextExam ? examProgress(studentId, nextExam.id) : null,
      latestReport: getReport(studentId, date),
      unreadNotifications: db
        .prepare("SELECT COUNT(*) AS n FROM notifications WHERE student_id=? AND is_read=0")
        .get(studentId).n,
      pendingRecovery: db
        .prepare("SELECT COUNT(*) AS n FROM recovery_requests WHERE student_id=? AND status='pending'")
        .get(studentId).n,
      recentAttempts: recent.map(function (attempt) {
        return {
          id: attempt.id,
          quizId: attempt.quiz_id,
          correct: attempt.correct,
          wrong: attempt.wrong,
          blank: attempt.blank,
          percent: attempt.percent,
          submittedAt: attempt.submitted_at,
        };
      }),
    };
  }

  function dashboard(studentId, date) {
    return studentDashboard(studentId, date, false);
  }

  function studentPlanForDate(studentId, date) {
    var p = db
      .prepare(
        "SELECT * FROM plans WHERE student_id=? AND plan_date=? AND published=1",
      )
      .get(studentId, date);
    return mapPlan(p, studentId);
  }

  function studentPlansInRange(studentId, from, to) {
    return db
      .prepare(
        "SELECT * FROM plans WHERE student_id=? AND plan_date BETWEEN ? AND ? AND published=1 ORDER BY plan_date",
      )
      .all(studentId, from, to)
      .map(function (p) {
        return mapPlan(p, studentId);
      });
  }

  function adminPlanForDate(studentId, date) {
    var p = db
      .prepare("SELECT * FROM plans WHERE student_id=? AND plan_date=?")
      .get(studentId, date);
    return mapPlan(p, studentId);
  }

  function adminPlansInRange(studentId, from, to, options) {
    options = options || {};
    var sql = "SELECT * FROM plans p WHERE p.student_id=? AND p.plan_date BETWEEN ? AND ?";
    var params = [studentId, from, to];
    if (options.status === "published") sql += " AND p.published=1";
    else if (options.status === "draft") sql += " AND p.published=0";
    else if (options.status === "incomplete") {
      sql += " AND EXISTS(SELECT 1 FROM tasks t LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=p.student_id WHERE t.plan_id=p.id AND (tc.id IS NULL OR tc.status<>'done'))";
    }
    if (options.search) {
      sql += " AND (p.title LIKE ? OR EXISTS(SELECT 1 FROM tasks t WHERE t.plan_id=p.id AND (t.title LIKE ? OR t.subject LIKE ? OR t.note LIKE ?)))";
      var needle = "%" + options.search + "%";
      params.push(needle, needle, needle, needle);
    }
    sql += " ORDER BY p.plan_date";
    var statement = db.prepare(sql);
    return statement
      .all.apply(statement, params)
      .map(function (p) {
        return mapPlan(p, studentId);
      });
  }

  function saveAdminPlan(body) {
    var studentId = str(body.studentId, 100);
    var planDate = str(body.planDate, 10);
    if (!db.prepare("SELECT id FROM students WHERE id=?").get(studentId)) {
      return { error: { status: 404, code: "NOT_FOUND", message: "دانش‌آموز پیدا نشد." } };
    }
    var existing = db
      .prepare("SELECT * FROM plans WHERE student_id=? AND plan_date=?")
      .get(studentId, planDate);
    var planId = existing ? existing.id : security.id("plan");
    var timestamp = now();
    if (existing) {
      db.prepare(
        "UPDATE plans SET jalali_id=?,day_label=?,persian_date=?,title=?,motivation_text=?,published=?,updated_at=? WHERE id=?",
      ).run(
        str(body.jalaliId, 30),
        str(body.dayLabel, 50),
        str(body.persianDate, 80),
        str(body.title, 300),
        str(body.motivationText, 600),
        boolInt(body.published),
        timestamp,
        planId,
      );
    } else {
      db.prepare(
        "INSERT INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        planId,
        studentId,
        planDate,
        str(body.jalaliId, 30),
        str(body.dayLabel, 50),
        str(body.persianDate, 80),
        str(body.title, 300),
        str(body.motivationText, 600),
        boolInt(body.published),
        timestamp,
        timestamp,
      );
    }
    return {
      data: {
        plan: mapPlan(db.prepare("SELECT * FROM plans WHERE id=?").get(planId), studentId),
        planId: planId,
        studentId: studentId,
        planDate: planDate,
        created: !existing,
        published: !!boolInt(body.published),
      },
    };
  }

  function updateAdminPlan(planId, body) {
    var plan = db.prepare("SELECT * FROM plans WHERE id=?").get(planId);
    if (!plan) {
      return { error: { status: 404, code: "NOT_FOUND", message: "برنامه پیدا نشد." } };
    }
    var map = {
      title: "title",
      dayLabel: "day_label",
      persianDate: "persian_date",
      jalaliId: "jalali_id",
      motivationText: "motivation_text",
      published: "published",
    };
    Object.keys(map).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        var col = map[key];
        var value =
          col === "published"
            ? boolInt(body[key])
            : str(body[key], key === "motivationText" ? 600 : 300);
        db.prepare("UPDATE plans SET " + col + "=?,updated_at=? WHERE id=?").run(
          value,
          now(),
          plan.id,
        );
      }
    });
    return {
      data: {
        plan: mapPlan(db.prepare("SELECT * FROM plans WHERE id=?").get(plan.id), plan.student_id),
        planId: plan.id,
        studentId: plan.student_id,
        planDate: plan.plan_date,
        published: Object.prototype.hasOwnProperty.call(body, "published") && !!boolInt(body.published),
      },
    };
  }

  function deleteAdminPlan(planId) {
    var plan = db.prepare("SELECT * FROM plans WHERE id=?").get(planId);
    if (!plan) {
      return { error: { status: 404, code: "NOT_FOUND", message: "برنامه پیدا نشد." } };
    }
    db.prepare("DELETE FROM plans WHERE id=?").run(plan.id);
    return { data: { deleted: true, planId: plan.id } };
  }

  function duplicateAdminPlan(sourceId, body) {
    var source = db.prepare("SELECT * FROM plans WHERE id=?").get(sourceId);
    if (!source) {
      return { error: { status: 404, code: "NOT_FOUND", message: "برنامه مبدا پیدا نشد." } };
    }
    var planDate = str(body.planDate, 10);
    if (
      db
        .prepare("SELECT id FROM plans WHERE student_id=? AND plan_date=?")
        .get(source.student_id, planDate)
    ) {
      return {
        error: {
          status: 409,
          code: "DUPLICATE",
          message: "برای تاریخ مقصد از قبل برنامه وجود دارد.",
        },
      };
    }
    var planId = security.id("plan");
    var timestamp = now();
    db.exec("BEGIN");
    try {
      db.prepare(
        "INSERT INTO plans (id,student_id,plan_date,jalali_id,day_label,persian_date,title,motivation_text,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)",
      ).run(
        planId,
        source.student_id,
        planDate,
        str(body.jalaliId, 30),
        str(body.dayLabel, 50),
        str(body.persianDate, 80),
        str(body.title, 300) || source.title,
        str(body.motivationText, 600) || source.motivation_text || "",
        timestamp,
        timestamp,
      );
      var tasks = db
        .prepare("SELECT * FROM tasks WHERE plan_id=? ORDER BY sort_order,start_time")
        .all(source.id);
      var insertTask = db.prepare(
        "INSERT INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      );
      tasks.forEach(function (task) {
        insertTask.run(
          security.id("task"),
          planId,
          task.start_time,
          task.end_time,
          task.type,
          task.subject,
          task.title,
          task.pages,
          task.test_count,
          task.note,
          task.quiz_id,
          task.exam_id,
          task.sort_order,
          timestamp,
          timestamp,
        );
      });
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return {
      data: {
        plan: mapPlan(db.prepare("SELECT * FROM plans WHERE id=?").get(planId), source.student_id),
        planId: planId,
        sourceId: source.id,
        studentId: source.student_id,
        planDate: planDate,
      },
    };
  }

  function createAdminTask(planId, body) {
    var plan = db.prepare("SELECT * FROM plans WHERE id=?").get(planId);
    if (!plan) {
      return { error: { status: 404, code: "NOT_FOUND", message: "برنامه پیدا نشد." } };
    }
    var taskType = str(body.type, 50) || "study";
    if (TASK_TYPES.indexOf(taskType) < 0) {
      return { error: { status: 400, code: "VALIDATION", message: "نوع فعالیت معتبر نیست." } };
    }
    var linkedExamId = str(body.examId, 120) || null;
    if (
      linkedExamId &&
      !db
        .prepare("SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
        .get(linkedExamId, plan.student_id)
    ) {
      return { error: { status: 400, code: "VALIDATION", message: "آزمون مرتبط معتبر نیست." } };
    }
    var taskId = security.id("task");
    var timestamp = now();
    db.prepare(
      "INSERT INTO tasks (id,plan_id,start_time,end_time,type,subject,title,pages,test_count,note,quiz_id,exam_id,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      taskId,
      plan.id,
      body.start,
      body.end,
      taskType,
      str(body.subject, 150),
      str(body.title, 300),
      str(body.pages, 300),
      Math.max(0, num(body.testCount, 0)),
      str(body.note, 1000),
      str(body.quizId, 100) || null,
      linkedExamId,
      num(body.sortOrder, 999),
      timestamp,
      timestamp,
    );
    return {
      data: {
        plan: mapPlan(plan, plan.student_id),
        taskId: taskId,
      },
    };
  }

  function updateAdminTask(taskId, body) {
    var task = db
      .prepare("SELECT t.*,p.student_id FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.id=?")
      .get(taskId);
    if (!task) {
      return { error: { status: 404, code: "NOT_FOUND", message: "فعالیت پیدا نشد." } };
    }
    var nextStart = Object.prototype.hasOwnProperty.call(body, "start") ? str(body.start, 5) : task.start_time;
    var nextEnd = Object.prototype.hasOwnProperty.call(body, "end") ? str(body.end, 5) : task.end_time;
    if (!timeValid(nextStart) || !timeValid(nextEnd) || nextEnd <= nextStart) {
      return { error: { status: 400, code: "VALIDATION", message: "زمان پایان باید بعد از زمان شروع باشد." } };
    }
    if (Object.prototype.hasOwnProperty.call(body, "type") && TASK_TYPES.indexOf(str(body.type, 50)) < 0) {
      return { error: { status: 400, code: "VALIDATION", message: "نوع فعالیت معتبر نیست." } };
    }
    if (Object.prototype.hasOwnProperty.call(body, "examId") && body.examId) {
      var examId = str(body.examId, 120);
      if (
        !db
          .prepare("SELECT id FROM exams WHERE id=? AND (student_id=? OR student_id IS NULL)")
          .get(examId, task.student_id)
      ) {
        return { error: { status: 400, code: "VALIDATION", message: "آزمون مرتبط معتبر نیست." } };
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "planId")) {
      var targetPlanId = str(body.planId, 120);
      var targetPlan = db
        .prepare("SELECT id FROM plans WHERE id=? AND student_id=?")
        .get(targetPlanId, task.student_id);
      if (!targetPlan) {
        return { error: { status: 400, code: "VALIDATION", message: "برنامه مقصد معتبر نیست." } };
      }
      db.prepare("UPDATE tasks SET plan_id=?,updated_at=? WHERE id=?").run(targetPlanId, now(), task.id);
      task.plan_id = targetPlanId;
    }
    var map = {
      start: "start_time",
      end: "end_time",
      type: "type",
      subject: "subject",
      title: "title",
      pages: "pages",
      testCount: "test_count",
      note: "note",
      quizId: "quiz_id",
      examId: "exam_id",
      sortOrder: "sort_order",
    };
    Object.keys(map).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        var col = map[key];
        var value =
          col === "test_count" || col === "sort_order"
            ? Math.max(0, num(body[key], 0))
            : str(body[key], 1000);
        if ((col === "start_time" || col === "end_time") && !timeValid(value)) {
          return;
        }
        db.prepare("UPDATE tasks SET " + col + "=?,updated_at=? WHERE id=?").run(
          value || null,
          now(),
          task.id,
        );
      }
    });
    var plan = db.prepare("SELECT * FROM plans WHERE id=?").get(task.plan_id);
    return {
      data: {
        plan: mapPlan(plan, task.student_id),
        taskId: task.id,
      },
    };
  }

  function batchUpdateAdminTasks(items) {
    if (!Array.isArray(items) || !items.length || items.length > 200) {
      return { error: { status: 400, code: "VALIDATION", message: "بین ۱ تا ۲۰۰ تغییر لازم است." } };
    }
    var updated = [];
    db.exec("BEGIN IMMEDIATE");
    try {
      items.forEach(function (item) {
        var id = str(item && item.id, 120);
        var result = updateAdminTask(id, item || {});
        if (result.error) throw result.error;
        updated.push(result.data.taskId);
      });
      db.exec("COMMIT");
      return { data: { updated: updated.length, taskIds: updated } };
    } catch (error) {
      db.exec("ROLLBACK");
      if (error && error.code) return { error: error };
      throw error;
    }
  }

  function adminRangeSummary(studentId, from, to) {
    var row = db.prepare(`SELECT COUNT(DISTINCT p.id) AS plans,COUNT(t.id) AS tasks,
      COALESCE(SUM((CAST(substr(t.end_time,1,2) AS INTEGER)*60+CAST(substr(t.end_time,4,2) AS INTEGER))-(CAST(substr(t.start_time,1,2) AS INTEGER)*60+CAST(substr(t.start_time,4,2) AS INTEGER))),0) AS minutes,
      COALESCE(SUM(t.test_count),0) AS tests,
      COALESCE(SUM(CASE WHEN p.published=1 THEN 1 ELSE 0 END),0) AS publishedTasks
      FROM plans p LEFT JOIN tasks t ON t.plan_id=p.id WHERE p.student_id=? AND p.plan_date BETWEEN ? AND ?`).get(studentId, from, to);
    return { plans:Number(row.plans||0),tasks:Number(row.tasks||0),minutes:Number(row.minutes||0),tests:Number(row.tests||0),publishedTasks:Number(row.publishedTasks||0) };
  }

  function deleteAdminTask(taskId) {
    var result = db.prepare("DELETE FROM tasks WHERE id=?").run(taskId);
    if (!result.changes) {
      return { error: { status: 404, code: "NOT_FOUND", message: "فعالیت پیدا نشد." } };
    }
    return { data: { deleted: true, taskId: taskId } };
  }

  function publishAdminPlanRange(studentId, from, to, published) {
    var result = db
      .prepare(
        "UPDATE plans SET published=?,updated_at=? WHERE student_id=? AND plan_date BETWEEN ? AND ?",
      )
      .run(published, now(), studentId, from, to);
    return {
      data: {
        updated: result.changes,
        published: !!published,
      },
    };
  }

  return {
    dashboard: dashboard,
    studentPlanForDate: studentPlanForDate,
    studentPlansInRange: studentPlansInRange,
    adminPlanForDate: adminPlanForDate,
    adminPlansInRange: adminPlansInRange,
    saveAdminPlan: saveAdminPlan,
    updateAdminPlan: updateAdminPlan,
    deleteAdminPlan: deleteAdminPlan,
    duplicateAdminPlan: duplicateAdminPlan,
    createAdminTask: createAdminTask,
    updateAdminTask: updateAdminTask,
    batchUpdateAdminTasks: batchUpdateAdminTasks,
    adminRangeSummary: adminRangeSummary,
    deleteAdminTask: deleteAdminTask,
    publishAdminPlanRange: publishAdminPlanRange,
    mapPlan: mapPlan,
    planMetrics: planMetrics,
  };
}

module.exports = createPlansService;
