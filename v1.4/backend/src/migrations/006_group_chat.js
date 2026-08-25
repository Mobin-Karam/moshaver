"use strict";

function addColumn(db, sql) {
  try { db.exec(sql); } catch (err) { if (!/duplicate column/i.test(String(err.message))) throw err; }
}

module.exports = {
  version: 6,
  useTransaction: false,
  up: function (db) {
    var studentColumn=db.prepare("PRAGMA table_info(chat_conversations)").all().filter(function(x){return x.name==='student_id';})[0];
    if(studentColumn&&studentColumn.notnull){
      db.exec("PRAGMA foreign_keys=OFF; PRAGMA legacy_alter_table=ON; BEGIN");
      try {
        db.exec(`ALTER TABLE chat_conversations RENAME TO chat_conversations_legacy;
          CREATE TABLE chat_conversations (
            id TEXT PRIMARY KEY,
            student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_message_at TEXT
          );
          INSERT INTO chat_conversations(id,student_id,created_at,updated_at,last_message_at)
            SELECT id,student_id,created_at,updated_at,last_message_at FROM chat_conversations_legacy;
          DROP TABLE chat_conversations_legacy;
          CREATE UNIQUE INDEX idx_chat_direct_student ON chat_conversations(student_id) WHERE student_id IS NOT NULL;
          COMMIT;`);
      } catch(e) { try{db.exec('ROLLBACK');}catch(ignore){} throw e; }
      db.exec("PRAGMA legacy_alter_table=OFF; PRAGMA foreign_keys=ON");
    }
    addColumn(db, "ALTER TABLE chat_conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'direct'");
    addColumn(db, "ALTER TABLE chat_conversations ADD COLUMN title TEXT");
    addColumn(db, "ALTER TABLE chat_conversations ADD COLUMN description TEXT");
    addColumn(db, "ALTER TABLE chat_conversations ADD COLUMN owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL");
    addColumn(db, "ALTER TABLE chat_conversations ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL");
    addColumn(db, "ALTER TABLE chat_conversations ADD COLUMN archived_at TEXT");
    addColumn(db, "ALTER TABLE chat_messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'");
    addColumn(db, "ALTER TABLE chat_messages ADD COLUMN payload_json TEXT");
    addColumn(db, "ALTER TABLE chat_messages ADD COLUMN pinned_at TEXT");
    addColumn(db, "ALTER TABLE chat_messages ADD COLUMN pinned_by TEXT REFERENCES users(id) ON DELETE SET NULL");
    addColumn(db, "ALTER TABLE realtime_events ADD COLUMN audience_user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_members (
        conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('owner','admin','member')) DEFAULT 'member',
        joined_at TEXT NOT NULL,
        invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        last_read_message_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL,
        muted INTEGER NOT NULL DEFAULT 0 CHECK(muted IN (0,1)),
        PRIMARY KEY(conversation_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id,conversation_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_single_owner ON conversation_members(conversation_id) WHERE role='owner';
      CREATE TABLE IF NOT EXISTS conversation_permissions (
        conversation_id TEXT PRIMARY KEY REFERENCES chat_conversations(id) ON DELETE CASCADE,
        members_can_send_messages INTEGER NOT NULL DEFAULT 1,
        members_can_add_members INTEGER NOT NULL DEFAULT 0,
        members_can_invite INTEGER NOT NULL DEFAULT 0,
        members_can_react INTEGER NOT NULL DEFAULT 1,
        members_can_use_mentions INTEGER NOT NULL DEFAULT 1,
        members_can_share_study_state INTEGER NOT NULL DEFAULT 1,
        members_can_share_exam_results INTEGER NOT NULL DEFAULT 1,
        members_can_share_learning_progress INTEGER NOT NULL DEFAULT 1,
        members_can_edit_own_messages INTEGER NOT NULL DEFAULT 1,
        members_can_delete_own_messages INTEGER NOT NULL DEFAULT 1,
        admins_can_delete_messages INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS message_reactions (
        message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(message_id,user_id,emoji)
      );
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id,created_at);
      CREATE TABLE IF NOT EXISTS message_mentions (
        message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY(message_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_message_mentions_user ON message_mentions(user_id,message_id);
      CREATE INDEX IF NOT EXISTS idx_chat_conversations_type_updated ON chat_conversations(type,updated_at);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_type_created ON chat_messages(conversation_id,message_type,created_at,id);
      CREATE INDEX IF NOT EXISTS idx_realtime_events_user ON realtime_events(audience_user_id,id);
    `);
  }
};
