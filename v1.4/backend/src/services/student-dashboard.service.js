"use strict";

function createStudentDashboardService(deps) {
  var db = deps.db;
  var todayIso = deps.todayIso;
  var mapPlan = deps.mapPlan;
  var planMetrics = deps.planMetrics;
  var getPresence = deps.getPresence;
  var activeStudySession = deps.activeStudySession;

  function studentRow(studentId) {
    return db.prepare("SELECT id,name,grade,major,target_major AS targetMajor,target_city AS targetCity,rank_goal AS rankGoal,daily_capacity AS dailyCapacity FROM students WHERE id=? AND account_status<>'archived'").get(studentId);
  }

  function recommendation(item) {
    var overdue = Math.max(0, Math.floor((Date.now() - new Date(item.dueDate + "T00:00:00Z").getTime()) / 86400000));
    if (overdue > 0) return { priority: overdue >= 3 ? "high" : "medium", reason: "overdue_review", reasonData: { days: overdue } };
    if (Number(item.mastery || 0) <= 2) return { priority: "high", reason: "low_mastery", reasonData: { mastery: Number(item.mastery || 0) } };
    return { priority: "normal", reason: "scheduled_review", reasonData: { intervalDays: Number(item.intervalDays || 1) } };
  }

  function today(studentId) {
    var student = studentRow(studentId);
    if (!student) return null;
    var date = todayIso();
    var rawPlan = db.prepare("SELECT * FROM plans WHERE student_id=? AND plan_date=? AND published=1 LIMIT 1").get(studentId, date);
    var plan = mapPlan(rawPlan, studentId);
    var metrics = planMetrics(plan);
    var currentTask = null, nextTask = null;
    if (plan && plan.tasks) {
      currentTask = plan.tasks.filter(function (x) { return !x.completion; })[0] || null;
      nextTask = plan.tasks.filter(function (x) { return !x.completion && (!currentTask || x.id !== currentTask.id); })[0] || null;
    }
    var due = db.prepare(`SELECT id,subject,book,chapter,lesson,topic,title,note,hint,due_date AS dueDate,
      interval_days AS intervalDays,mastery,review_count AS reviewCount FROM learning_items
      WHERE student_id=? AND status='pending' AND due_date<=? ORDER BY due_date,mastery LIMIT 8`).all(studentId, date);
    due = due.map(function (x) { x.recommendation = recommendation(x); return x; });
    var nextExam = db.prepare(`SELECT id,title,iso_date AS isoDate,open_at AS openAt,close_at AS closeAt
      FROM exams WHERE published=1 AND status<>'cancelled' AND (student_id=? OR student_id IS NULL) AND iso_date>=?
      ORDER BY iso_date,open_at LIMIT 1`).get(studentId, date) || null;
    var unread = {
      notifications: Number(db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE student_id=? AND is_read=0").get(studentId).n || 0),
      chat: Number(db.prepare(`SELECT COUNT(*) AS n FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id
        LEFT JOIN users u ON u.student_id=? AND u.role='student'
        LEFT JOIN chat_reads r ON r.conversation_id=c.id AND r.user_id=u.id
        WHERE c.student_id=? AND m.sender_role='admin' AND m.deleted_at IS NULL AND m.created_at>COALESCE(r.last_read_at,'0000')`).get(studentId, studentId).n || 0),
    };
    return { student: student, plan: plan, planMetrics: metrics, currentTask: currentTask, nextTask: nextTask, today: {
      taskTotal: metrics.totalTasks, taskDone: metrics.doneTasks, taskPartial: metrics.partialTasks,
      plannedMinutes: metrics.plannedMinutes, actualMinutes: metrics.actualMinutes,
      plannedTests: metrics.plannedTests, actualTests: metrics.actualTests,
    }, dueReviews: due, nextExam: nextExam, attention: due.slice(0, 3).map(function (x) {
      return { type: "learning", title: x.title, subject: x.subject || "", priority: x.recommendation.priority, reason: x.recommendation.reason, reasonData: x.recommendation.reasonData };
    }), unread: unread, activeSession: activeStudySession(studentId), lastSyncAt: new Date().toISOString() };
  }

  function topicPerformance(studentId, limit) {
    var n = Math.min(100, Math.max(1, Number(limit || 40)));
    return db.prepare(`SELECT COALESCE(NULLIF(q.subject,''),'بدون درس') AS subject,
      COALESCE(NULLIF(qq.topic,''),NULLIF(qq.lesson,''),NULLIF(qq.chapter,''),'بدون مبحث') AS topic,
      COUNT(DISTINCT a.id) AS attempts,COUNT(qa.id) AS answered,
      SUM(CASE WHEN qa.is_correct=1 THEN 1 ELSE 0 END) AS correct,
      SUM(CASE WHEN qa.is_correct=0 AND qa.selected_option IS NOT NULL THEN 1 ELSE 0 END) AS wrong,
      SUM(CASE WHEN qa.selected_option IS NULL THEN 1 ELSE 0 END) AS blank,
      ROUND(100.0*SUM(CASE WHEN qa.is_correct=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(qa.id),0),1) AS accuracy,
      MAX(a.submitted_at) AS lastAttemptAt
      FROM quiz_answers qa JOIN quiz_attempts a ON a.id=qa.attempt_id JOIN quiz_questions qq ON qq.id=qa.question_id JOIN quizzes q ON q.id=a.quiz_id
      WHERE a.student_id=? GROUP BY subject,topic ORDER BY accuracy ASC,answered DESC LIMIT ?`).all(studentId, n).map(function (x) {
        var accuracy = Number(x.accuracy || 0), answered = Number(x.answered || 0), status = "Not Enough Data";
        if (answered >= 5) status = accuracy >= 80 ? "Strong" : accuracy >= 65 ? "Improving" : accuracy >= 50 ? "Unstable" : "Weak";
        x.attempts = Number(x.attempts || 0); x.answered = answered; x.correct = Number(x.correct || 0); x.wrong = Number(x.wrong || 0); x.blank = Number(x.blank || 0); x.accuracy = accuracy; x.status = status;
        return x;
      });
  }

  function weekly(studentId) {
    var end = todayIso(), startDate = new Date(end + "T00:00:00Z"); startDate.setUTCDate(startDate.getUTCDate() - 6);
    var start = startDate.toISOString().slice(0, 10);
    var study = db.prepare(`SELECT COALESCE(SUM(actual_minutes),0) AS minutes,COALESCE(SUM(tests_completed),0) AS tests
      FROM study_sessions WHERE student_id=? AND status='finished' AND substr(started_at,1,10) BETWEEN ? AND ?`).get(studentId, start, end);
    var attempts = db.prepare(`SELECT COUNT(*) AS attempts,COALESCE(SUM(correct+wrong+blank),0) AS tests,
      ROUND(AVG(percent),1) AS accuracy FROM quiz_attempts WHERE student_id=? AND substr(submitted_at,1,10) BETWEEN ? AND ?`).get(studentId, start, end);
    var tasks = db.prepare(`SELECT COUNT(t.id) AS total,SUM(CASE WHEN tc.status IN ('done','partial') THEN 1 ELSE 0 END) AS completed
      FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=?
      WHERE p.student_id=? AND p.plan_date BETWEEN ? AND ? AND p.published=1`).get(studentId, studentId, start, end);
    var topics = topicPerformance(studentId, 20), weak = topics.filter(function (x) { return x.status === "Weak" || x.status === "Unstable"; })[0] || null;
    return { from: start, to: end, studyMinutes: Number(study.minutes || 0), tests: Number(attempts.tests || 0) + Number(study.tests || 0), accuracy: Number(attempts.accuracy || 0), attempts: Number(attempts.attempts || 0), planCompletion: Number(tasks.total || 0) ? Math.round(100 * Number(tasks.completed || 0) / Number(tasks.total)) : 0, weakTopic: weak, suggestions: weak ? [{ code: "review_weak_topic", subject: weak.subject, topic: weak.topic }] : [] };
  }

  function attention(options) {
    var limit = Math.min(100, Math.max(1, Number(options.limit || 50))), offset = Math.max(0, Number(options.offset || 0));
    var rows = db.prepare(`SELECT s.id,s.name,s.grade,s.major,s.account_status AS accountStatus,sp.last_seen_at AS lastSeenAt,
      (SELECT COUNT(*) FROM learning_items li WHERE li.student_id=s.id AND li.status='pending' AND li.due_date<=date('now')) AS dueReviews,
      (SELECT ROUND(AVG(percent),1) FROM (SELECT percent FROM quiz_attempts qa WHERE qa.student_id=s.id ORDER BY submitted_at DESC LIMIT 3)) AS recentAccuracy,
      (SELECT COUNT(*) FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=s.id WHERE p.student_id=s.id AND p.plan_date=date('now') AND tc.id IS NULL) AS remainingTasks
      FROM students s LEFT JOIN student_presence sp ON sp.student_id=s.id WHERE s.account_status<>'archived' ORDER BY s.name LIMIT ? OFFSET ?`).all(limit, offset);
    return rows.map(function (x) {
      var reasons = [], severity = "green", lastAge = x.lastSeenAt ? (Date.now() - new Date(x.lastSeenAt).getTime()) / 86400000 : 999;
      if (Number(x.dueReviews || 0) >= 3) reasons.push({ code: "overdue_reviews", value: Number(x.dueReviews), label: "مرور عقب‌افتاده" });
      if (x.recentAccuracy != null && Number(x.recentAccuracy) < 50) reasons.push({ code: "weak_exam_performance", value: Number(x.recentAccuracy), label: "دقت پایین آزمون" });
      if (lastAge >= 2) reasons.push({ code: "no_recent_activity", value: Math.floor(lastAge), label: "عدم فعالیت اخیر" });
      if (reasons.length) severity = reasons.some(function (r) { return r.code !== "no_recent_activity" || r.value >= 3; }) ? "red" : "yellow";
      x.dueReviews = Number(x.dueReviews || 0); x.recentAccuracy = x.recentAccuracy == null ? null : Number(x.recentAccuracy); x.remainingTasks = Number(x.remainingTasks || 0); x.reasons = reasons; x.severity = severity; x.presence = getPresence(x.id);
      return x;
    }).filter(function (x) { return options.all || x.reasons.length; });
  }

  function realtimeSnapshot(options) {
    options = options || {};
    var limit = Math.min(100, Math.max(1, Number(options.limit || 100))), date = todayIso();
    var rows = db.prepare(`SELECT s.id,s.name,s.grade,s.major,s.account_status AS accountStatus,sp.state AS presenceState,
      sp.last_seen_at AS lastSeenAt,sp.active_task_id AS activeTaskId,sp.device_label AS deviceLabel,
      (SELECT COUNT(*) FROM learning_items li WHERE li.student_id=s.id AND li.status='pending' AND li.due_date<=?) AS dueReviews,
      (SELECT COUNT(t.id) FROM tasks t JOIN plans p ON p.id=t.plan_id LEFT JOIN task_completions tc ON tc.task_id=t.id AND tc.student_id=s.id WHERE p.student_id=s.id AND p.plan_date=? AND tc.id IS NULL) AS remainingTasks,
      (SELECT ae.metadata_json FROM activity_events ae WHERE ae.student_id=s.id AND ae.event_type='screen.viewed' ORDER BY ae.created_at DESC LIMIT 1) AS viewMetadata,
      (SELECT ae.created_at FROM activity_events ae WHERE ae.student_id=s.id ORDER BY ae.created_at DESC LIMIT 1) AS lastActivityAt,
      (SELECT ROUND(qa.percent,1) FROM quiz_attempts qa WHERE qa.student_id=s.id ORDER BY qa.submitted_at DESC LIMIT 1) AS lastExamPercent
      FROM students s LEFT JOIN student_presence sp ON sp.student_id=s.id
      WHERE s.account_status<>'archived' ORDER BY COALESCE(sp.last_seen_at,'') DESC,s.name LIMIT ?`).all(date, date, limit);
    var students = rows.map(function (x) {
      var presence = getPresence(x.id), session = activeStudySession(x.id), age = presence.lastSeenAt ? Date.now() - new Date(presence.lastSeenAt).getTime() : Infinity;
      var freshness = !presence.online ? "offline" : age < 60000 ? "live" : age < 300000 ? "recent" : "stale";
      var state = session ? (session.paused ? "paused" : "studying") : presence.online ? (presence.state === "taking_exam" ? "taking_exam" : "online") : "offline";
      var view = {};
      try { view = JSON.parse(x.viewMetadata || "{}"); } catch (e) {}
      return { id:x.id,name:x.name,grade:x.grade||"",major:x.major||"",accountStatus:x.accountStatus,
        state:state,freshness:freshness,presence:presence,activeSession:session,currentView:view.viewLabel||view.view||"",
        dueReviews:Number(x.dueReviews||0),remainingTasks:Number(x.remainingTasks||0),lastExamPercent:x.lastExamPercent==null?null:Number(x.lastExamPercent),lastActivityAt:x.lastActivityAt||presence.lastSeenAt||null };
    });
    var timeline = db.prepare(`SELECT ae.*,s.name AS student_name FROM activity_events ae JOIN students s ON s.id=ae.student_id
      WHERE s.account_status<>'archived' ORDER BY ae.created_at DESC LIMIT 100`).all().map(function (x) {
      var metadata={}; try { metadata=JSON.parse(x.metadata_json||"{}"); } catch(e) {}
      return { id:x.id,studentId:x.student_id,studentName:x.student_name,eventType:x.event_type,entityType:x.entity_type||"",entityId:x.entity_id||"",metadata:metadata,createdAt:x.created_at };
    });
    var summary = { total:students.length,online:0,studying:0,paused:0,takingExam:0,attention:0 };
    students.forEach(function (x) { if(x.presence.online)summary.online++; if(x.state==="studying")summary.studying++; if(x.state==="paused")summary.paused++; if(x.state==="taking_exam")summary.takingExam++; if(x.dueReviews>=3||(x.lastExamPercent!=null&&x.lastExamPercent<50))summary.attention++; });
    return { generatedAt:new Date().toISOString(),summary:summary,students:students,timeline:timeline };
  }

  return { today: today, weekly: weekly, topicPerformance: topicPerformance, attention: attention, realtimeSnapshot: realtimeSnapshot };
}

module.exports = createStudentDashboardService;
