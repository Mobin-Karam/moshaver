import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");
function walk(dir) { return readdirSync(dir).flatMap((name) => { const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(path) ? [path] : []; }); }
const source = walk(src).map((file) => readFileSync(file, "utf8")).join("\n");

const contracts = {
  auth: ["/auth/login", "/auth/logout", "/auth/me", "/auth/change-password", "/auth/sessions"],
  dashboard: ["/admin/students/${students.studentId}/overview", "/admin/advisor-inbox", "/admin/chat/conversations"],
  live: ["/admin/live?studentId=", "api.openEvents"],
  chat: ["/chat/conversations/${active.id}/messages", "/chat/conversations/${active?.id}/read"],
  planner: ["/admin/plans", "/admin/plans/publish-range", "/admin/tasks/${id}", "/admin/import/preview", "/admin/import/commit", "/admin/import/template", "/admin/export/json"],
  exams: ["/admin/exams", "/admin/exam-attempt-requests", "/admin/syllabus/${id}", "/admin/exams/${examId}/syllabus"],
  questions: ["/admin/exams/${examId}/questions", "/admin/questions/${id}", "/admin/quizzes", "/admin/quizzes/${quizId}/questions"],
  students: ["/admin/students?limit=100", "/reset-password", "/admin/students/${selectedId}/${action}", "/overview", "/learning", "/attempts", "/progress/weekly", "/performance/topics"],
  subjects: ["/admin/subjects", "/admin/student-subjects/"],
  reports: ["/admin/reports?studentId="],
  notifications: ["/notifications?limit=50", "/notifications/read-all"],
  system: ["/admin/system/database", "/admin/system/database-backup", "/admin/system/database-restore", "/admin/import/history", "/admin/app-releases", "/admin/audit"],
};

const failures = Object.entries(contracts).flatMap(([area, tokens]) => tokens.filter((token) => !source.includes(token)).map((token) => `${area}: ${token}`));
console.log(`Parity contracts: ${Object.keys(contracts).length} areas, ${Object.values(contracts).flat().length} required integrations.`);
if (failures.length) { console.error("Missing integrations:\n" + failures.map((item) => `- ${item}`).join("\n")); process.exit(1); }
console.log("Parity gate: all v1.6 capability families are represented in admin-v2 source.");
