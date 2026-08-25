"use strict";

var webPush = require("web-push");

function createPushService(deps) {
  var db = deps.db, env = deps.env, now = deps.now;
  var enabled = !!(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject);
  if (enabled) {
    try { webPush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey); }
    catch (error) { enabled = false; console.error("web push disabled: invalid VAPID configuration"); }
  }

  function categoryAllowed(userId, type) {
    var row = db.prepare("SELECT * FROM notification_preferences WHERE user_id=?").get(userId);
    if (!row) return true;
    var key = type === "message" ? "messages" : type === "exam" ? "exams" : type === "lesson" ? "lessons" : "announcements";
    return Number(row[key]) === 1;
  }

  async function sendRows(rows, notification) {
    if (!enabled || !notification) return { sent: 0, removed: 0 };
    var sent = 0, removed = 0;
    await Promise.all(rows.map(async function (sub) {
      if (!categoryAllowed(sub.user_id, notification.type)) return;
      try {
        await webPush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
          notificationId: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type || "announcement",
          url: notification.url || "/",
        }), { TTL: 300, urgency: notification.type === "message" ? "high" : "normal" });
        db.prepare("UPDATE push_subscriptions SET last_success_at=?,failure_count=0,updated_at=? WHERE id=?").run(now(), now(), sub.id);
        sent++;
      } catch (error) {
        var status = Number(error && error.statusCode || 0);
        if (status === 404 || status === 410) { db.prepare("DELETE FROM push_subscriptions WHERE id=?").run(sub.id); removed++; }
        else db.prepare("UPDATE push_subscriptions SET failure_count=failure_count+1,updated_at=? WHERE id=?").run(now(), sub.id);
        if (status !== 404 && status !== 410) console.error("web push failed:", status || "network", error.message);
      }
    }));
    return { sent: sent, removed: removed };
  }

  function sendToUser(userId, notification) {
    if (!userId) return Promise.resolve({ sent: 0, removed: 0 });
    return sendRows(db.prepare("SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id=ps.user_id WHERE u.id=? AND u.is_active=1").all(userId), notification);
  }

  function sendToStudent(studentId, notification) {
    if (!studentId) return Promise.resolve({ sent: 0, removed: 0 });
    return sendRows(db.prepare("SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id=ps.user_id WHERE u.student_id=? AND u.is_active=1").all(studentId), notification);
  }

  return { enabled: enabled, publicKey: env.vapidPublicKey || "", sendToStudent: sendToStudent, sendToUser: sendToUser };
}

module.exports = createPushService;
