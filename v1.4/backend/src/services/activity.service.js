"use strict";

function createActivityService(deps) {
  var db = deps.db;
  var security = deps.security;
  var realtime = deps.realtime;
  var now = deps.now;
  var str = deps.str;
  var safeJsonParse = deps.safeJsonParse;
  var pushService = deps.pushService;

  function emitAdmin(studentId, type, payload) {
    try {
      return realtime.emit(db, "admin", studentId, type, payload, now);
    } catch (e) {
      console.error("realtime admin emit failed:", e.message);
      return null;
    }
  }

  function emitStudent(studentId, type, payload) {
    try {
      return realtime.emit(db, "student", studentId, type, payload, now);
    } catch (e) {
      console.error("realtime student emit failed:", e.message);
      return null;
    }
  }

  function recordActivity(studentId, eventType, entityType, entityId, metadata) {
    if (!studentId || !eventType) return;
    var item = {
      studentId: studentId,
      eventType: str(eventType, 80),
      entityType: entityType ? str(entityType, 80) : "",
      entityId: entityId ? str(entityId, 120) : "",
      metadata: metadata || {},
      createdAt: now(),
    };
    try {
      db.prepare(
        "INSERT INTO activity_events (id,student_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)",
      ).run(
        security.id("event"),
        studentId,
        item.eventType,
        item.entityType || null,
        item.entityId || null,
        JSON.stringify(item.metadata),
        item.createdAt,
      );
      emitAdmin(studentId, item.eventType, item);
    } catch (e) {
      console.error("activity insert failed:", e.message);
    }
  }

  function notifyStudent(studentId, title, body, options) {
    if (!studentId) return;
    try {
      var id = security.id("notification");
      var timestamp = now();
      options = options || {};
      var item = {
        id: id,
        title: str(title, 160),
        body: str(body, 1000),
        isRead: false,
        createdAt: timestamp,
        type: str(options.type || "announcement", 40),
        url: str(options.url || "/", 500),
        data: options.data || {},
      };
      var target = db.prepare("SELECT id FROM users WHERE student_id=? AND role='student' AND is_active=1 LIMIT 1").get(studentId);
      db.prepare(
        "INSERT INTO notifications (id,student_id,user_id,title,body,is_read,created_at,type,url,data_json) VALUES (?,?,?,?,?,0,?,?,?,?)",
      ).run(id, studentId, target ? target.id : null, item.title, item.body, timestamp, item.type, item.url, JSON.stringify(item.data));
      emitStudent(studentId, "notification.created", item);
      if (pushService) pushService.sendToStudent(studentId, item).catch(function (error) { console.error("push dispatch failed:", error.message); });
    } catch (e) {
      console.error("notification insert failed:", e.message);
    }
  }

  function notifyUser(userId, title, body, options) {
    var user = db.prepare("SELECT id,role,student_id FROM users WHERE id=? AND is_active=1").get(userId);
    if (!user) return;
    if (user.role === "student" && user.student_id) return notifyStudent(user.student_id, title, body, options);
    try {
      var id = security.id("notification"), timestamp = now();
      options = options || {};
      var item = { id:id, title:str(title,160), body:str(body,1000), isRead:false, createdAt:timestamp, type:str(options.type||"announcement",40), url:str(options.url||"/",500), data:options.data||{} };
      db.prepare("INSERT INTO notifications (id,student_id,user_id,title,body,is_read,created_at,type,url,data_json) VALUES (?,NULL,?,?,?,0,?,?,?,?)")
        .run(id,user.id,item.title,item.body,timestamp,item.type,item.url,JSON.stringify(item.data));
      realtime.emitUser(db,user.id,"notification.created",item,now);
      if(pushService)pushService.sendToUser(user.id,item).catch(function(error){console.error("push dispatch failed:",error.message);});
    } catch(e) { console.error("notification insert failed:",e.message); }
  }

  function getPresence(studentId) {
    var presence = db
      .prepare("SELECT * FROM student_presence WHERE student_id=?")
      .get(studentId);
    if (!presence) {
      return {
        studentId: studentId,
        state: "offline",
        online: false,
        lastSeenAt: null,
        activeTaskId: null,
        activeSessionId: null,
        deviceLabel: "",
      };
    }
    var age = Date.now() - new Date(presence.last_seen_at).getTime();
    return {
      studentId: studentId,
      state: presence.state,
      online: age < 120000,
      lastSeenAt: presence.last_seen_at,
      activeTaskId: presence.active_task_id || null,
      activeSessionId: presence.active_session_id || null,
      deviceLabel: presence.device_label || "",
    };
  }

  function touchPresence(studentId, state, taskId, sessionId, deviceLabel) {
    var previous = db
      .prepare("SELECT * FROM student_presence WHERE student_id=?")
      .get(studentId);
    var timestamp = now();
    var nextState = str(state, 30) || "online";
    db.prepare(
      "INSERT INTO student_presence (student_id,state,active_task_id,active_session_id,last_seen_at,device_label) VALUES (?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET state=excluded.state,active_task_id=excluded.active_task_id,active_session_id=excluded.active_session_id,last_seen_at=excluded.last_seen_at,device_label=excluded.device_label",
    ).run(
      studentId,
      nextState,
      taskId || null,
      sessionId || null,
      timestamp,
      str(deviceLabel, 120),
    );
    var result = getPresence(studentId);
    if (
      !previous ||
      previous.state !== nextState ||
      (previous.active_task_id || null) !== (taskId || null) ||
      (previous.active_session_id || null) !== (sessionId || null)
    ) {
      emitAdmin(studentId, "presence.changed", result);
    }
    return result;
  }

  function activeStudySession(studentId) {
    var row = db
      .prepare(
        "SELECT ss.*,t.subject,t.title,t.start_time,t.end_time FROM study_sessions ss LEFT JOIN tasks t ON t.id=ss.task_id WHERE ss.student_id=? AND ss.status='active' ORDER BY ss.started_at DESC LIMIT 1",
      )
      .get(studentId);
    if (!row) return null;
    return {
      id: row.id,
      studentId: row.student_id,
      taskId: row.task_id || null,
      startedAt: row.started_at,
      lastHeartbeatAt: row.last_heartbeat_at,
      status: row.status,
      subject: row.subject || "",
      title: row.title || "",
      plannedStart: row.start_time || "",
      plannedEnd: row.end_time || "",
      note: row.note || "",
      paused: Boolean(row.paused_at),
      pausedAt: row.paused_at || null,
      pausedSeconds: Number(row.paused_seconds || 0),
      testsCompleted: Number(row.tests_completed || 0),
    };
  }

  function mapActivityRows(rows) {
    return rows.map(function (row) {
      return {
        id: row.id,
        studentId: row.student_id,
        eventType: row.event_type,
        entityType: row.entity_type || "",
        entityId: row.entity_id || "",
        metadata: safeJsonParse(row.metadata_json, {}),
        createdAt: row.created_at,
      };
    });
  }

  return {
    emitAdmin: emitAdmin,
    emitStudent: emitStudent,
    recordActivity: recordActivity,
    notifyStudent: notifyStudent,
    notifyUser: notifyUser,
    touchPresence: touchPresence,
    getPresence: getPresence,
    activeStudySession: activeStudySession,
    mapActivityRows: mapActivityRows,
  };
}

module.exports = createActivityService;
