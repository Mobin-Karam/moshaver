"use strict";

var permissions = require("../permissions");

function createChatService(deps) {
  var db = deps.db;
  var security = deps.security;
  var now = deps.now;
  var getPresence = deps.getPresence;

  function getOrCreateConversation(studentId) {
    var conversation = db
      .prepare("SELECT * FROM chat_conversations WHERE student_id=?")
      .get(studentId);
    if (conversation) return conversation;
    var timestamp = now();
    var id = security.id("conv");
    db.prepare(
      "INSERT INTO chat_conversations (id,student_id,created_at,updated_at,last_message_at) VALUES (?,?,?,?,NULL)",
    ).run(id, studentId, timestamp, timestamp);
    return db.prepare("SELECT * FROM chat_conversations WHERE id=?").get(id);
  }

  function canUseConversation(user, conversationId) {
    var conversation = db
      .prepare("SELECT * FROM chat_conversations WHERE id=?")
      .get(conversationId);
    if (!conversation) return null;
    if (conversation.type === "group") {
      if (conversation.archived_at) return null;
      return db.prepare("SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?").get(conversationId,user.id) ? conversation : null;
    }
    return permissions.canAccessStudent(db, user, conversation.student_id) ? conversation : null;
  }

  function getReadAt(conversationId, userId) {
    var row = db
      .prepare("SELECT last_read_at FROM chat_reads WHERE conversation_id=? AND user_id=?")
      .get(conversationId, userId);
    return row ? row.last_read_at : null;
  }

  function markConversationRead(conversationId, user) {
    var timestamp = now();
    var c=db.prepare("SELECT type FROM chat_conversations WHERE id=?").get(conversationId);
    if(c&&c.type==='group'){
      var latest=db.prepare("SELECT id FROM chat_messages WHERE conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 1").get(conversationId);
      db.prepare("UPDATE conversation_members SET last_read_message_id=? WHERE conversation_id=? AND user_id=?").run(latest?latest.id:null,conversationId,user.id);
    }
    db.prepare(
      "INSERT INTO chat_reads (conversation_id,user_id,last_read_at) VALUES (?,?,?) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_at=excluded.last_read_at",
    ).run(conversationId, user.id, timestamp);
    return timestamp;
  }

  function conversationUnread(conversationId, user) {
    var c=db.prepare("SELECT type FROM chat_conversations WHERE id=?").get(conversationId);
    if(c&&c.type==='group'){
      return db.prepare("SELECT COUNT(*) n FROM chat_messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id AND cm.user_id=? LEFT JOIN chat_messages lr ON lr.id=cm.last_read_message_id WHERE m.conversation_id=? AND m.sender_user_id<>? AND m.deleted_at IS NULL AND (lr.id IS NULL OR m.created_at>lr.created_at OR (m.created_at=lr.created_at AND m.id>lr.id))").get(user.id,conversationId,user.id).n;
    }
    var readAt = getReadAt(conversationId, user.id) || "0000-01-01T00:00:00.000Z";
    return db
      .prepare(
        "SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id=? AND sender_user_id<>? AND deleted_at IS NULL AND created_at>?",
      )
      .get(conversationId, user.id, readAt).n;
  }

  function mapChatMessage(row, otherReadAt, viewerUserId) {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderUserId: row.sender_user_id,
      senderRole: row.sender_role,
      senderName: row.sender_name || "",
      text: row.message_text,
      type: row.message_type || "text",
      payload: (function(){ try { return JSON.parse(row.payload_json || "{}"); } catch(e) { return {}; } })(),
      replyToId: row.reply_to_id || null,
      createdAt: row.created_at,
      editedAt: row.edited_at || null,
      deletedAt: row.deleted_at || null,
      pinnedAt: row.pinned_at || null,
      reactions: row.id ? db.prepare("SELECT emoji,COUNT(*) count,MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END) reacted FROM message_reactions WHERE message_id=? GROUP BY emoji").all(viewerUserId || "",row.id).map(function(x){return {emoji:x.emoji,count:Number(x.count),reacted:!!x.reacted};}) : [],
      seen: !!(
        viewerUserId &&
        row.sender_user_id === viewerUserId &&
        otherReadAt &&
        row.created_at <= otherReadAt
      ),
    };
  }

  function chatMessages(conversationId, limit, beforeMessageId) {
    var requested = Number(limit == null ? 15 : limit);
    if (!isFinite(requested)) requested = 15;
    var n = Math.min(50, Math.max(1, Math.floor(requested))), rows, cursor = null;
    if (beforeMessageId) {
      cursor = db.prepare("SELECT created_at,id FROM chat_messages WHERE id=? AND conversation_id=?").get(beforeMessageId, conversationId);
      if (!cursor) return null;
    }
    if (cursor) {
      rows = db.prepare(
        "SELECT cm.*,u.display_name AS sender_name FROM chat_messages cm JOIN users u ON u.id=cm.sender_user_id WHERE cm.conversation_id=? AND (cm.created_at<? OR (cm.created_at=? AND cm.id<?)) ORDER BY cm.created_at DESC,cm.id DESC LIMIT ?",
      ).all(conversationId, cursor.created_at, cursor.created_at, cursor.id, n + 1);
    } else {
      rows = db.prepare(
        "SELECT cm.*,u.display_name AS sender_name FROM chat_messages cm JOIN users u ON u.id=cm.sender_user_id WHERE cm.conversation_id=? ORDER BY cm.created_at DESC,cm.id DESC LIMIT ?",
      ).all(conversationId, n + 1);
    }
    var hasMore = rows.length > n;
    if (hasMore) rows.length = n;
    rows.reverse();
    return { rows: rows, hasMore: hasMore, nextBeforeMessageId: rows.length ? rows[0].id : null };
  }

  function adminChatList(adminUser, limit, offset, search) {
    var requested = Number(limit == null ? 15 : limit), requestedOffset = Number(offset == null ? 0 : offset);
    if (!isFinite(requested)) requested = 15;
    if (!isFinite(requestedOffset)) requestedOffset = 0;
    var n = Math.min(100, Math.max(1, Math.floor(requested))), skip = Math.max(0, Math.floor(requestedOffset)), term = String(search || "").trim().slice(0, 120), args = [];
    var where = "s.active=1";
    if (term) { where += " AND (s.name LIKE ? OR EXISTS(SELECT 1 FROM chat_conversations c JOIN chat_messages m ON m.conversation_id=c.id WHERE c.student_id=s.id AND m.deleted_at IS NULL AND m.message_text LIKE ?))"; args.push("%" + term + "%", "%" + term + "%"); }
    var totalStmt = db.prepare("SELECT COUNT(*) AS n FROM students s WHERE " + where), listStmt = db.prepare("SELECT s.id,s.name,s.grade FROM students s WHERE " + where + " ORDER BY s.name LIMIT ? OFFSET ?");
    var total = totalStmt.get.apply(totalStmt, args).n;
    var students = listStmt.all.apply(listStmt, args.concat([n + 1, skip])), hasMore = students.length > n;
    if (hasMore) students.length = n;
    var items = students.map(function (student) {
      var conversation = getOrCreateConversation(student.id);
      var last = db
        .prepare(
          "SELECT cm.*,u.display_name AS sender_name FROM chat_messages cm JOIN users u ON u.id=cm.sender_user_id WHERE cm.conversation_id=? AND cm.deleted_at IS NULL ORDER BY cm.created_at DESC,cm.id DESC LIMIT 1",
        )
        .get(conversation.id);
      return {
        id: conversation.id,
        student: { id: student.id, name: student.name, grade: student.grade },
        lastMessage: last ? mapChatMessage(last, null, adminUser.id) : null,
        unread: conversationUnread(conversation.id, adminUser),
        presence: getPresence(student.id),
      };
    });
    var unread = db.prepare("SELECT COUNT(*) AS n FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id LEFT JOIN chat_reads r ON r.conversation_id=m.conversation_id AND r.user_id=? WHERE c.type='direct' AND m.sender_user_id<>? AND m.deleted_at IS NULL AND m.created_at>COALESCE(r.last_read_at,'0000-01-01T00:00:00.000Z')").get(adminUser.id, adminUser.id).n;
    return { items: items, total: Number(total || 0), totalUnread: Number(unread || 0), limit: n, offset: skip, hasMore: hasMore, nextOffset: hasMore ? skip + items.length : null };
  }

  return {
    getOrCreateConversation: getOrCreateConversation,
    canUseConversation: canUseConversation,
    getReadAt: getReadAt,
    markConversationRead: markConversationRead,
    conversationUnread: conversationUnread,
    mapChatMessage: mapChatMessage,
    chatMessages: chatMessages,
    adminChatList: adminChatList,
  };
}

module.exports = createChatService;
