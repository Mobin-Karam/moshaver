import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");
function walk(dir) { return readdirSync(dir).flatMap((name) => { const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(path) ? [path] : []; }); }
const source = walk(src).map((file) => readFileSync(file, "utf8")).join("\n");

const contracts = {
  auth: ["/auth/login", "/auth/logout", "/auth/me", "/auth/change-password", "/auth/sessions"],
  dashboard: ["/dashboard", "/students/${encodeURIComponent(studentId)}/advisor-inbox", "/chat/conversations"],
  live: ["/live?limit=100", "api.openEvents"],
  chat: ["/chat/conversations/${conversationId}/messages", "/chat/conversations/${conversationId}/read"],
  planner: ["/plans?studentId=", "/plans/publish-range", "/tasks/${id}", "/import/preview", "/import/commit", "/import/template", "/export/json"],
  exams: ["/exams?studentId=", "/exam-attempt-requests", "/syllabus/${syllabusId}", "/exams/${examId}/syllabus"],
  questions: ["/exams/${examId}/questions", "/questions/${id}", "/quizzes", "/quizzes/${quizId}/questions"],
  students: ["/students", "/reset-password", "/students/${id}/${action}", "/overview", "/learning", "/exam-attempts", "/progress/weekly", "/performance/topics"],
  subjects: ["/subjects", "/students/${studentId}/subjects"],
  reports: ["/students/${studentId}/reports"],
  notifications: ["/notifications?limit=20", "/notifications/read-all"],
  system: ["/system/database", "/system/database-backup", "/system/database-restore", "/import/history", "/app-releases", "/audit"],
};

const failures = Object.entries(contracts).flatMap(([area, tokens]) => tokens.filter((token) => !source.includes(token)).map((token) => `${area}: ${token}`));
console.log(`Parity contracts: ${Object.keys(contracts).length} areas, ${Object.values(contracts).flat().length} required integrations.`);
if (failures.length) { console.error("Missing integrations:\n" + failures.map((item) => `- ${item}`).join("\n")); process.exit(1); }
console.log("Parity gate: all v1.6 capability families are represented in admin-v2 source.");
