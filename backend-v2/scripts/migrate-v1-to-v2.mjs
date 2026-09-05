import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const argv = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || true];
}));
if (!argv.source || !argv.target) throw new Error("Usage: npm run migrate:v1 -- --source=/absolute/v1.sqlite --target=/absolute/v2.sqlite --organization-name='Legacy organization' [--platform-owner-username=user] [--report=/path/migration-report.json]");
const sourcePath = path.resolve(String(argv.source));
const targetPath = path.resolve(String(argv.target));
if (sourcePath === targetPath) throw new Error("Source and target must be different files");
if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) throw new Error("Both source and migrated target SQLite files must already exist");

const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
const target = new Database(targetPath, { fileMustExist: true });
source.pragma("query_only = ON");
target.pragma("foreign_keys = ON");
const now = new Date().toISOString();
const deterministicId = (kind, value) => crypto.createHash("sha256").update(`v1:${kind}:${value}`).digest("hex").slice(0, 32);
const hasTable = (db, table) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
const rows = (table) => hasTable(source, table) ? source.prepare(`SELECT * FROM "${table}"`).all() : [];
const counts = {};
const skipped = [];
const insert = (table, record, conflict = "IGNORE") => {
  const clean = Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
  const columns = Object.keys(clean);
  const result = target.prepare(`INSERT OR ${conflict} INTO "${table}" (${columns.map((x) => `"${x}"`).join(",")}) VALUES (${columns.map((x) => `@${x}`).join(",")})`).run(clean);
  counts[table] = (counts[table] || 0) + result.changes;
};
const json = (value, fallback = {}) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const roleId = (code) => target.prepare("SELECT id FROM roles WHERE code=?").get(code)?.id;
const sourceUsers = rows("users");
const admins = sourceUsers.filter((user) => user.role === "admin");
const ownerUsername = argv["platform-owner-username"] ? String(argv["platform-owner-username"]) : null;
if (admins.length && !argv["organization-name"]) throw new Error("--organization-name is required when migrating legacy staff accounts");
if (ownerUsername && !admins.some((user) => user.username === ownerUsername)) throw new Error("Configured platform owner is not a legacy admin username");
if (admins.length === 1 && !ownerUsername) throw new Error("One legacy admin exists; explicitly confirm it with --platform-owner-username or omit platform promotion by passing --platform-owner-username=none");
const promoteOwner = ownerUsername && ownerUsername !== "none" ? ownerUsername : null;
const migrationActorId = sourceUsers.find((user) => user.username === promoteOwner)?.id ?? admins[0]?.id ?? sourceUsers.find((user) => user.role !== "student")?.id ?? null;
const organizationId = deterministicId("organization", String(argv["organization-name"] || "legacy"));

const migrate = target.transaction(() => {
  if (!hasTable(target, "user_role_assignments") || !hasTable(target, "exam_assignments")) throw new Error("Target schema is not fully migrated");
  if (argv["organization-name"]) insert("organizations", { id: organizationId, name: String(argv["organization-name"]), type: "SCHOOL", status: "ACTIVE", createdAt: now, updatedAt: now });

  // 1-6: users, explicit roles, organization membership, profiles and source-backed relationships.
  for (const user of sourceUsers) {
    const [firstName, ...last] = String(user.display_name || user.username).trim().split(/\s+/);
    insert("users", { id:user.id, username:user.username, passwordHash:user.password_hash, role:user.role === "student" ? "STUDENT" : "USER", firstName, lastName:last.join(" "), status:user.is_active ? "ACTIVE" : "INACTIVE", locale:"fa-IR", timezone:"Asia/Tehran", createdAt:user.created_at || now, updatedAt:user.updated_at || now });
    const mappedRole = user.role === "student" ? "STUDENT" : user.role === "advisor" ? "ADVISOR" : user.role === "teacher" ? "TEACHER" : user.role === "guardian" ? "GUARDIAN" : user.username === promoteOwner ? "PLATFORM_ADMIN" : "ORGANIZATION_ADMIN";
    const membershipId = !argv["organization-name"] ? null : deterministicId("membership", user.id);
    if (membershipId) insert("organization_memberships", { id:membershipId, organizationId, userId:user.id, status:"ACTIVE", joinedAt:user.created_at || now, createdAt:user.created_at || now, updatedAt:user.updated_at || now });
    insert("user_role_assignments", { id:deterministicId("role", `${user.id}:${mappedRole}`), userId:user.id, roleId:roleId(mappedRole), membershipId:mappedRole === "PLATFORM_ADMIN" ? null : membershipId, createdAt:user.created_at || now });
  }
  for (const student of rows("students")) {
    const user = sourceUsers.find((item) => item.student_id === student.id && item.role === "student");
    if (!user) { skipped.push({ table:"students", id:student.id, reason:"no STUDENT user" }); continue; }
    insert("students", { id:student.id, userId:user.id, name:student.name, grade:student.grade || "", major:student.major || "", targetUniversity:student.target_city || "", targetField:student.target_major || "", targetRank:student.rank_goal || "", dailyCapacity:student.daily_capacity || "", accountStatus:student.account_status || (student.active ? "active" : "inactive"), createdAt:student.created_at || now, updatedAt:student.updated_at || now });
  }
  const relationMap = [["advisor_students","advisor_id","ADVISOR_OF"],["teacher_students","teacher_id","TEACHER_OF"],["student_guardians","guardian_id","GUARDIAN_OF"]];
  for (const [table, userColumn, type] of relationMap) for (const item of rows(table)) insert("user_relationships", { id:deterministicId("relationship", `${type}:${item[userColumn]}:${item.student_id}`), fromUserId:item[userColumn], toStudentId:item.student_id, organizationId:argv["organization-name"] ? organizationId : null, type, status:"ACTIVE", createdAt:item.created_at || now, updatedAt:item.created_at || now, acceptedAt:item.created_at || now });

  // 7-13: curriculum, plans, tasks, feedback and learning. Runtime sessions are deliberately omitted.
  for (const item of rows("subjects")) insert("subjects", { id:item.id, organizationId:null, code:item.subject_key, name:item.name, active:1, createdAt:item.created_at || now, updatedAt:item.updated_at || now });
  for (const item of rows("student_subjects")) insert("student_subjects", { id:deterministicId("student-subject", `${item.student_id}:${item.subject_id}`), studentId:item.student_id, subjectId:item.subject_id, enabled:1, displayName:null, weeklyTargetMinutes:0, createdAt:now, updatedAt:now });
  for (const item of rows("plans")) insert("plans", { id:item.id, studentId:item.student_id, date:item.plan_date, status:item.published ? "PUBLISHED" : "DRAFT", createdAt:item.created_at || now, updatedAt:item.updated_at || now, deletedAt:null });
  const completions = new Map(rows("task_completions").map((item) => [item.task_id, item]));
  for (const item of rows("tasks")) { const completion=completions.get(item.id); insert("tasks", { id:item.id, planId:item.plan_id, type:String(item.type || "study").toUpperCase(), title:item.title || item.subject || "Task", description:item.pages || "", duration:completion?.actual_minutes || 0, priority:item.sort_order || 0, completedAt:completion ? completion.updated_at : null, subject:item.subject || "", startTime:item.start_time || "", endTime:item.end_time || "", testCount:item.test_count || 0, note:item.note || completion?.note || "", status:completion ? "COMPLETED" : "PLANNED", createdAt:item.created_at || now, updatedAt:item.updated_at || now }); }
  for (const item of rows("advisor_comments")) if (item.task_id) insert("task_comments", { id:item.id, text:item.body, createdAt:item.created_at || now, taskId:item.task_id, studentId:item.student_id });
  for (const item of rows("task_issues")) insert("task_issues", { id:item.id, type:item.issue_type, description:item.note || "", status:String(item.status || "open").toUpperCase(), createdAt:item.created_at || now, taskId:item.task_id, studentId:item.student_id });
  for (const item of rows("study_sessions")) insert("study_sessions", { id:item.id, status:String(item.status || "active").toUpperCase(), startedAt:item.started_at, lastStartedAt:item.started_at, lastHeartbeatAt:item.last_heartbeat_at, pausedAt:item.paused_at, finishedAt:item.ended_at, elapsedSeconds:Number(item.actual_minutes || 0)*60, actualTests:item.tests_completed || 0, difficulty:"", note:item.note || "", createdAt:item.created_at || now, updatedAt:item.updated_at || now, studentId:item.student_id, taskId:item.task_id });
  for (const item of rows("learning_items")) insert("learning_items", { id:item.id, studentId:item.student_id, subject:item.subject || "", book:item.book || "", chapter:item.chapter || "", lesson:item.lesson || "", topic:item.topic || "", title:item.title, note:item.note || "", hint:item.hint || "", dueDate:item.due_date, intervalDays:item.interval_days, reviewCount:item.review_count, mastery:item.mastery, status:item.status, completedAt:item.completed_at, createdAt:item.created_at || now, updatedAt:item.updated_at || now });
  for (const item of rows("learning_item_reviews")) insert("learning_reviews", { id:item.id, itemId:item.learning_item_id, rating:item.rating, previousMastery:item.previous_mastery, newMastery:item.new_mastery, previousIntervalDays:item.previous_interval_days, nextIntervalDays:item.next_interval_days, nextReviewAt:item.next_review_at, reviewedAt:item.reviewed_at });

  // 14-20: exams, assignments, syllabus, questions, quizzes, attempts and mistakes.
  if (rows("exams").some((item) => item.student_id) && !migrationActorId) throw new Error("Legacy exam assignments require at least one migrated staff actor");
  for (const item of rows("exams")) insert("exams", { id:item.id, title:item.title, subject:"", duration:item.duration_minutes || 120, attemptLimit:item.max_attempts || 1, startTime:item.open_at || item.iso_date, endTime:item.close_at || null, organizationId:argv["organization-name"] ? organizationId : null, createdById:migrationActorId, createdAt:item.created_at || now, updatedAt:item.updated_at || now, deletedAt:null });
  for (const item of rows("exams")) if (item.student_id) insert("exam_assignments", { id:deterministicId("exam-assignment", `${item.id}:${item.student_id}`), examId:item.id, studentId:item.student_id, assignedById:migrationActorId, assignedAt:item.created_at || now, createdAt:item.created_at || now });
  for (const item of rows("exam_syllabus")) insert("exam_syllabus", { id:item.id, subject:item.subject_label, description:item.description, required:item.required, track:item.track || "", examId:item.exam_id });
  for (const item of rows("syllabus_progress")) insert("syllabus_progress", { id:deterministicId("syllabus-progress", `${item.student_id}:${item.syllabus_id}`), status:String(item.status).toUpperCase(), accuracy:item.accuracy, note:item.note || "", updatedAt:item.updated_at || now, studentId:item.student_id, syllabusId:item.syllabus_id });
  for (const item of rows("quizzes")) insert("quizzes", { id:item.id, title:item.title, subject:item.subject || "", durationMinutes:item.duration_minutes, active:item.active, createdAt:item.created_at || now, updatedAt:item.updated_at || now, examId:item.exam_id, organizationId:argv["organization-name"] ? organizationId : null });
  for (const item of rows("quiz_questions")) insert("quiz_questions", { id:item.id, text:item.question_text, options:JSON.stringify([item.option_a,item.option_b,item.option_c,item.option_d]), correctAnswer:item.correct_option, explanation:item.explanation || "", sortOrder:item.sort_order, quizId:item.quiz_id });
  for (const item of rows("quiz_attempts")) { const answers=rows("quiz_answers").filter((answer)=>answer.attempt_id===item.id).map((answer)=>({questionId:answer.question_id,selectedAnswer:answer.selected_option,isCorrect:Boolean(answer.is_correct)})); insert("quiz_attempts", { id:item.id, startedAt:item.started_at, submittedAt:item.submitted_at, answers:JSON.stringify(answers), correct:item.correct, wrong:item.wrong, blank:item.blank, percent:item.percent, quizId:item.quiz_id, studentId:item.student_id }); for(const answer of rows("quiz_answers").filter((x)=>x.attempt_id===item.id&&x.error_reason)) insert("mistakes", { id:answer.id, studentId:item.student_id, questionId:answer.question_id, reason:answer.error_reason, resolved:0 }); }

  // 21-27: reports/recovery, conversations, notifications, releases and appropriate audit history.
  for (const item of rows("exam_attempt_requests")) insert("exam_retry_requests", { id:item.id, message:item.message || "", status:String(item.status).toUpperCase(), moderatorNote:item.advisor_note || "", resolvedAt:item.resolved_at, createdAt:item.created_at || now, updatedAt:item.updated_at || now, examId:item.exam_id, studentId:item.student_id, resolvedById:item.resolved_by });
  for (const item of rows("daily_reports")) insert("daily_reports", { id:item.id, planDate:item.plan_date, studyHours:Number(item.study_hours || 0), tests:item.tests || 0, correct:item.correct || 0, wrong:item.wrong || 0, blank:item.blank || 0, focus:item.focus || 0, fatigue:item.fatigue || 0, motivation:item.motivation || 0, problem:item.problem || "", tomorrow:item.tomorrow || "", createdAt:item.created_at || now, updatedAt:item.updated_at || now, studentId:item.student_id });
  for (const item of rows("recovery_requests")) insert("recovery_requests", { id:item.id, planDate:item.plan_date, reason:item.reason || "", note:item.note || "", status:item.status || "pending", createdAt:item.created_at || now, updatedAt:item.updated_at || now, studentId:item.student_id });
  const studentUser = new Map(sourceUsers.filter((x)=>x.student_id).map((x)=>[x.student_id,x.id]));
  for (const item of rows("chat_conversations")) insert("conversations", { id:item.id, type:String(item.type || "direct").toUpperCase(), title:item.title || "", ownerId:item.owner_user_id, createdAt:item.created_at || now, updatedAt:item.updated_at || now });
  for (const item of rows("conversation_members")) insert("conversation_members", { id:deterministicId("conversation-member", `${item.conversation_id}:${item.user_id}`), role:String(item.role || "member").toUpperCase(), muted:item.muted, leftAt:null, lastReadAt:null, joinedAt:item.joined_at || now, conversationId:item.conversation_id, userId:item.user_id });
  for (const conversation of rows("chat_conversations").filter((item)=>String(item.type || "direct").toLowerCase()==="direct")) {
    const participantIds = new Set(rows("chat_messages").filter((message)=>message.conversation_id===conversation.id).map((message)=>message.sender_user_id));
    const studentOwner = studentUser.get(conversation.student_id); if (studentOwner) participantIds.add(studentOwner);
    for (const userId of participantIds) insert("conversation_members", { id:deterministicId("conversation-member", `${conversation.id}:${userId}`), role:"MEMBER", muted:0, leftAt:null, lastReadAt:null, joinedAt:conversation.created_at || now, conversationId:conversation.id, userId });
  }
  const legacyMessages = rows("chat_messages");
  const mentionsByMessage = new Map();
  for (const mention of rows("message_mentions")) mentionsByMessage.set(mention.message_id, [...(mentionsByMessage.get(mention.message_id) || []), mention.user_id]);
  for (const item of legacyMessages) insert("chat_messages", { id:item.id, receiverId:"", type:item.message_type || "text", content:item.message_text, createdAt:item.created_at || now, senderId:item.sender_user_id, readAt:null, conversationId:item.conversation_id, mentions:JSON.stringify(mentionsByMessage.get(item.id) || []), replyToId:null, editedAt:item.edited_at, deletedAt:item.deleted_at });
  for (const item of legacyMessages) if (item.reply_to_id) target.prepare("UPDATE chat_messages SET replyToId=? WHERE id=?").run(item.reply_to_id, item.id);
  for (const item of rows("message_reactions")) insert("message_reactions", { id:deterministicId("message-reaction", `${item.message_id}:${item.user_id}:${item.emoji}`), emoji:item.emoji, createdAt:item.created_at || now, messageId:item.message_id, userId:item.user_id });
  for (const item of rows("notifications")) { const userId=item.user_id || studentUser.get(item.student_id); if (!userId) { skipped.push({table:"notifications",id:item.id,reason:"no owning user"}); continue; } insert("notifications", { id:item.id, type:item.type || "announcement", category:item.type || "announcement", title:item.title, body:item.body, url:item.url, data:item.data_json || "{}", priority:"NORMAL", readAt:item.is_read ? item.created_at : null, createdAt:item.created_at || now, expiresAt:null, dedupeKey:null, userId, organizationId:null }); }
  for (const item of rows("notification_preferences")) insert("notification_preferences", { id:deterministicId("notification-preference", item.user_id), categories:JSON.stringify({lessons:Boolean(item.lessons),messages:Boolean(item.messages),exams:Boolean(item.exams),announcements:Boolean(item.announcements)}), enabled:1, updatedAt:item.updated_at || now, userId:item.user_id });
  for (const item of rows("app_releases")) insert("app_releases", { id:deterministicId("app-release", `${item.app_name}:${item.version}`), app:item.app_name, version:item.version, notes:item.notes || "", createdAt:item.updated_at || now });
  for (const item of rows("app_versions")) target.prepare("INSERT INTO app_versions(app,version,notes,updatedAt) VALUES(?,?,?,?) ON CONFLICT(app) DO UPDATE SET version=excluded.version,updatedAt=excluded.updatedAt").run(item.app_name,item.version,"",item.updated_at || now);
  for (const item of rows("audit_logs")) insert("audit_logs", { id:item.id, action:item.action, entity:item.entity_type || "legacy", metadata:item.details_json || "{}", createdAt:item.created_at || now, userId:item.user_id });
});

let failure;
try { migrate(); } catch (error) { failure=error; }
const scalar = (sql) => Number(target.prepare(sql).pluck().get() || 0);
const checks = {
  usersWithoutRoles: scalar("SELECT count(*) FROM users u WHERE NOT EXISTS(SELECT 1 FROM user_role_assignments r WHERE r.userId=u.id)"),
  profilesWithoutUsers: scalar("SELECT count(*) FROM students s LEFT JOIN users u ON u.id=s.userId WHERE u.id IS NULL"),
  studentsWithoutStudentRole: scalar("SELECT count(*) FROM students s WHERE NOT EXISTS(SELECT 1 FROM user_role_assignments a JOIN roles r ON r.id=a.roleId WHERE a.userId=s.userId AND r.code='STUDENT')"),
  membershipsWithoutUsers: scalar("SELECT count(*) FROM organization_memberships m LEFT JOIN users u ON u.id=m.userId WHERE u.id IS NULL"),
  relationshipsWithoutBothSides: scalar("SELECT count(*) FROM user_relationships r LEFT JOIN users u ON u.id=r.fromUserId LEFT JOIN students s ON s.id=r.toStudentId WHERE u.id IS NULL OR s.id IS NULL"),
  crossOrganizationInvalidLinks: scalar("SELECT count(*) FROM user_relationships r JOIN organization_memberships m ON m.userId=r.fromUserId WHERE r.organizationId IS NOT NULL AND m.organizationId<>r.organizationId"),
  tasksWithoutPlans: scalar("SELECT count(*) FROM tasks t LEFT JOIN plans p ON p.id=t.planId WHERE p.id IS NULL"),
  attemptsWithoutAssignedExams: scalar("SELECT count(*) FROM exam_attempts a WHERE NOT EXISTS(SELECT 1 FROM exam_assignments x WHERE x.examId=a.examId AND x.studentId=a.studentId)"),
  notificationsWithoutUsers: scalar("SELECT count(*) FROM notifications n LEFT JOIN users u ON u.id=n.userId WHERE u.id IS NULL"),
  messagesWithoutConversations: scalar("SELECT count(*) FROM chat_messages m LEFT JOIN conversations c ON c.id=m.conversationId WHERE c.id IS NULL"),
  foreignKeyViolations: target.pragma("foreign_key_check").length,
};
const report = { schemaVersion:"1.0.0", generatedAt:now, source:sourcePath, target:targetPath, sourceReadOnly:true, sessionsMigrated:false, organization:argv["organization-name"] ? {id:organizationId,name:argv["organization-name"]}:null, platformOwnerUsername:promoteOwner, inserted:counts, skipped, checks, success:!failure && Object.values(checks).every((value)=>value===0), error:failure ? String(failure.message || failure) : null };
const reportPath = path.resolve(String(argv.report || path.join(path.dirname(targetPath), "migration-report.json")));
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode:0o600 });
source.close(); target.close();
console.log(JSON.stringify({ report:reportPath, success:report.success, inserted:counts, checks }, null, 2));
if (failure || !report.success) process.exitCode=1;
