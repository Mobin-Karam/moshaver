const base = (process.env.E2E_API_URL || "http://127.0.0.1:4000/api/v2").replace(/\/$/, "");
const username = process.env.E2E_STUDENT_USERNAME || "e2e.student.a";
const password = process.env.E2E_PASSWORD || "Moshaver-e2e-2026!";
const login = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
const loginPayload = await login.json();
if (login.status !== 201) throw new Error(`login failed: ${login.status} ${JSON.stringify(loginPayload)}`);
const session = { cookie: login.headers.getSetCookie()[0].split(";")[0], csrf: loginPayload.data.csrfToken };

async function request(method, path, body) {
  const headers = { cookie: session.cookie, accept: "application/json" };
  if (body !== undefined) { headers["content-type"] = "application/json"; headers["x-csrf-token"] = session.csrf; }
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  console.log(`PASS ${method} ${path}: ${response.status}`);
  return payload.data;
}

async function loginAs(name) {
  const response = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name, password }) });
  const payload = await response.json();
  if (response.status !== 201) throw new Error(`${name} login failed`);
  return { cookie: response.headers.getSetCookie()[0].split(";")[0], csrf: payload.data.csrfToken };
}
async function requestAs(actor, method, path, body, role = "PLATFORM_ADMIN") {
  const headers = { cookie: actor.cookie, accept: "application/json", "x-work-role": role };
  if (body !== undefined) { headers["content-type"] = "application/json"; headers["x-csrf-token"] = actor.csrf; }
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload.data;
}

const context = await request("GET", "/me/context");
if (!context.roles.includes("STUDENT")) throw new Error("student context missing");
const student = await request("GET", "/students/me");
const platform = await loginAs("e2e.platform");
const exam = await requestAs(platform, "POST", "/exams", { title: `Student journey ${Date.now()}`, subject: "E2E", durationMinutes: 10, attemptLimit: 1, questions: [{ question: "2 + 2?", options: ["3", "4", "5", "6"], correctOption: "b", explanation: "4" }] });
await requestAs(platform, "POST", `/exams/${exam.id}/assignments`, { studentIds: [student.id] });
await request("GET", "/student/dashboard");
await request("GET", `/student/plans?date=${new Date().toISOString().slice(0, 10)}`);
await request("GET", "/student/study-sessions/active");
await request("GET", `/students/${student.id}/subjects`);
await request("GET", "/student/progress");
await request("GET", "/student/reviews");
const assignedExams = await request("GET", "/student/exams");
if (!assignedExams.some((item) => item.id === exam.id)) throw new Error("assigned exam missing from student list");
const run = await request("POST", `/student/exams/${exam.id}/start`, {});
await request("PATCH", `/student/exams/attempts/${run.runId}`, { answers: [{ questionId: run.quiz.questions[0].id, selectedOption: "b" }] });
const result = await request("POST", `/student/exams/${exam.id}/submit`, { answers: [{ questionId: run.quiz.questions[0].id, selectedOption: "b" }] });
if (result.score !== 100) throw new Error(`server scoring mismatch: ${JSON.stringify(result)}`);
await request("GET", "/student/exams/attempts");
await request("GET", "/quizzes/history");
await request("GET", "/student/mistakes");
await request("GET", "/reports");
await request("GET", "/recovery-requests");
await request("GET", "/notifications?limit=50");
await request("GET", "/chat/conversations");
await request("GET", "/sync");
await request("GET", "/relationships");
const today = new Date().toISOString().slice(0, 10);
await request("POST", "/reports", { planDate: today, focus: 7, fatigue: 3, motivation: 8, problem: "e2e", tomorrow: "continue" });
await request("POST", "/recovery-requests", { planDate: today, reason: "E2E verification", note: "Disposable database journey verification" });
const mutationId = `e2e-${Date.now()}`;
const upload = await request("POST", "/sync/upload", { changes: [{ id: mutationId, clientMutationId: mutationId, type: "daily_report", method: "POST", path: "/reports", body: { planDate: today, focus: 6, fatigue: 4, motivation: 7 } }] });
if (!Array.isArray(upload.accepted) || upload.accepted[0]?.id !== mutationId || upload.acceptedCount !== 1) throw new Error(`sync reconciliation failed: ${JSON.stringify(upload)}`);
console.log("Student v2 journey E2E passed.");
