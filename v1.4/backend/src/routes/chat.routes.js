"use strict";

function registerChatRoutes(router, deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var str = deps.str;
  var query = deps.query;
  var ok = deps.ok;
  var fail = deps.fail;
  var audit = deps.audit;
  var bucketAllow = deps.bucketAllow;
  var emitAdmin = deps.emitAdmin;
  var emitStudent = deps.emitStudent;
  var notifyStudent = deps.notifyStudent;
  var getOrCreateConversation = deps.getOrCreateConversation;
  var canUseConversation = deps.canUseConversation;
  var getReadAt = deps.getReadAt;
  var markConversationRead = deps.markConversationRead;
  var conversationUnread = deps.conversationUnread;
  var mapChatMessage = deps.mapChatMessage;
  var chatMessages = deps.chatMessages;
  var adminChatList = deps.adminChatList;

  // Sending is regular REST; receiving is delivered over the shared SSE stream.
  router.add(
    "GET",
    /^\/api\/v1\/chat\/conversation$/,
    ["student"],
    function (req, res, match, body, user) {
      var c = getOrCreateConversation(user.student_id),
        admin = db
          .prepare(
            "SELECT id,display_name FROM users WHERE role='admin' AND is_active=1 ORDER BY created_at LIMIT 1",
          )
          .get();
      ok(res, {
        id: c.id,
        studentId: c.student_id,
        advisor: admin
          ? { id: admin.id, name: admin.display_name }
          : { id: null, name: "مشاور" },
        unread: conversationUnread(c.id, user),
      });
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/chat\/conversations\/([^/]+)\/messages$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      var c = canUseConversation(user, match[1]);
      if (!c) return fail(res, 404, "NOT_FOUND", "گفت‌وگو پیدا نشد.");
      var qy = query(req), page = chatMessages(c.id, qy.limit, str(qy.beforeMessageId, 120)), otherRead = null;
      if(c.type==='direct'&&user.role==='admin'){
        var studentUser=db.prepare("SELECT id FROM users WHERE role='student' AND student_id=? AND is_active=1 ORDER BY created_at LIMIT 1").get(c.student_id);
        otherRead=studentUser?getReadAt(c.id,studentUser.id):null;
      }else if(c.type==='direct'){
        var adminRead=db.prepare("SELECT MAX(r.last_read_at) AS read_at FROM chat_reads r JOIN users u ON u.id=r.user_id WHERE r.conversation_id=? AND u.role='admin' AND u.is_active=1").get(c.id);
        otherRead=adminRead&&adminRead.read_at||null;
      }
      if (!page) return fail(res, 400, "INVALID_CURSOR", "نشانگر صفحه پیام معتبر نیست.");
      ok(res, {
        conversationId: c.id,
        messages: page.rows.map(function (r) {
          return mapChatMessage(r, otherRead, user.id);
        }),
        hasMore: page.hasMore,
        nextBeforeMessageId: page.nextBeforeMessageId,
        unread: conversationUnread(c.id, user),
        otherReadAt: otherRead,
      });
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/chat\/conversations\/([^/]+)\/messages$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      var c = canUseConversation(user, match[1]);
      if (!c) return fail(res, 404, "NOT_FOUND", "گفت‌وگو پیدا نشد.");
      if (c.type === "group") {
        var gm = db.prepare("SELECT cm.role,cp.members_can_send_messages FROM conversation_members cm JOIN conversation_permissions cp ON cp.conversation_id=cm.conversation_id WHERE cm.conversation_id=? AND cm.user_id=?").get(c.id,user.id);
        if (!gm || (gm.role === "member" && !gm.members_can_send_messages)) return fail(res,403,"FORBIDDEN","ارسال پیام برای اعضا غیرفعال است.");
      }
      if (!bucketAllow("chat:" + user.id, 30, 60000))
        return fail(
          res,
          429,
          "RATE_LIMITED",
          "تعداد پیام‌های ارسالی زیاد است. کمی صبر کنید.",
        );
      var rawText = body.text == null ? "" : String(body.text).trim();
      if (rawText.length > 3000) return fail(res, 400, "VALIDATION", "متن پیام نباید بیشتر از ۳۰۰۰ نویسه باشد.");
      var text = rawText,
        reply = str(body.replyToId, 120) || null;
      if (!text) return fail(res, 400, "VALIDATION", "متن پیام لازم است.");
      if (
        reply &&
        !db
          .prepare(
            "SELECT 1 FROM chat_messages WHERE id=? AND conversation_id=?",
          )
          .get(reply, c.id)
      )
        return fail(res, 400, "VALIDATION", "پیام مرجع معتبر نیست.");
      var id = security.id("msg"),
        t = now();
      db.prepare(
        "INSERT INTO chat_messages (id,conversation_id,sender_user_id,sender_role,message_text,reply_to_id,created_at,edited_at,deleted_at,message_type,payload_json) VALUES (?,?,?,?,?,?,?,NULL,NULL,'text',NULL)",
      ).run(id, c.id, user.id, user.role, text, reply, t);
      if (c.type === "group") {
        var mentionNames=[],mentionRe=/(^|\s)@([\w.\-\u0600-\u06ff]{2,40})/g,mentionMatch;
        while((mentionMatch=mentionRe.exec(text)))mentionNames.push(mentionMatch[2]);
        mentionNames.slice(0,20).forEach(function(name){var target=db.prepare("SELECT u.id,cm.muted FROM users u JOIN conversation_members cm ON cm.user_id=u.id WHERE cm.conversation_id=? AND u.username=?").get(c.id,name);if(target){db.prepare("INSERT OR IGNORE INTO message_mentions(message_id,user_id,created_at) VALUES(?,?,?)").run(id,target.id,t);if(deps.emitUser)deps.emitUser(target.id,"chat.mention.created",{conversationId:c.id,messageId:id,senderName:user.display_name});if(deps.notifyUser&&!target.muted)deps.notifyUser(target.id,'در یک گروه نام شما ذکر شد',user.display_name+' شما را در یک پیام منشن کرد.',{type:'message',url:'/messages/'+c.id});}});
      }
      db.prepare(
        "UPDATE chat_conversations SET updated_at=?,last_message_at=? WHERE id=?",
      ).run(t, t, c.id);
      var item = {
        id: id,
        conversationId: c.id,
        senderUserId: user.id,
        senderRole: user.role,
        senderName: user.display_name,
        text: text,
        type: "text",
        payload: {},
        reactions: [],
        replyToId: reply,
        createdAt: t,
        seen: false,
        studentId: c.student_id,
      };
      if(c.type==='group'&&reply&&deps.notifyUser){var replied=db.prepare("SELECT m.sender_user_id,cm.muted FROM chat_messages m LEFT JOIN conversation_members cm ON cm.conversation_id=m.conversation_id AND cm.user_id=m.sender_user_id WHERE m.id=?").get(reply);if(replied&&replied.sender_user_id!==user.id&&!replied.muted)deps.notifyUser(replied.sender_user_id,'پاسخ جدید در گفتگو',user.display_name+' به پیام شما پاسخ داد.',{type:'message',url:'/messages/'+c.id});}
      if (c.type === "group" && deps.emitConversation) {
        deps.emitConversation(c.id,"chat.message.created",item,user.id);
      } else if (user.role === "admin") {
        emitStudent(c.student_id, "chat.message.created", item);
        notifyStudent(c.student_id, "پیام جدید از مشاور", text.slice(0, 180), { type: "message", url: "/messages/" + c.id });
      } else {
        emitAdmin(c.student_id, "chat.message.created", item);
        if(deps.notifyAdmins)deps.notifyAdmins("پیام جدید دانش‌آموز",text.slice(0,180),{type:"message",url:"/messages/"+c.id,data:{studentId:c.student_id,conversationId:c.id}});
      }
      audit(user, "CHAT_MESSAGE_SENT", "chat_message", id, {
        conversationId: c.id,
        studentId: c.student_id,
      });
      ok(res, item, 201);
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/chat\/conversations\/([^/]+)\/read$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      var c = canUseConversation(user, match[1]);
      if (!c) return fail(res, 404, "NOT_FOUND", "گفت‌وگو پیدا نشد.");
      var readAt = markConversationRead(c.id, user),
        payload = {
          conversationId: c.id,
          studentId: c.student_id,
          readerRole: user.role,
          readAt: readAt,
        };
      if (user.role === "admin")
        emitStudent(c.student_id, "chat.messages.read", payload);
      else emitAdmin(c.student_id, "chat.messages.read", payload);
      ok(res, payload);
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/admin\/chat\/conversations$/,
    ["admin"],
    function (req, res, match, body, user) {
      var qy = query(req);
      var page = adminChatList(user, qy.limit || 100, qy.offset || 0, qy.search);
      ok(res, qy.limit || qy.offset ? page : page.items);
    },
  );
}

module.exports = registerChatRoutes;
