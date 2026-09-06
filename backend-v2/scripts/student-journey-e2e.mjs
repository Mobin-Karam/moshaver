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
async function raw(actor, method, path, body, role) {
  const headers = { cookie: actor.cookie, accept: "application/json" };
  if (role) headers["x-work-role"] = role;
  if (body !== undefined) { headers["content-type"] = "application/json"; headers["x-csrf-token"] = actor.csrf; }
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, payload: await response.json().catch(() => null) };
}
function assert(condition, name, evidence) {
  if (!condition) throw new Error(`${name}: ${JSON.stringify(evidence)}`);
  console.log(`PASS ${name}`);
}

const context = await request("GET", "/me/context");
if (!context.roles.includes("STUDENT")) throw new Error("student context missing");
const student = await request("GET", "/students/me");
const platform = await loginAs("e2e.platform");
const exam = await requestAs(platform, "POST", "/exams", { title: `Student journey ${Date.now()}`, subject: "E2E", durationMinutes: 10, attemptLimit: 1, questions: [{ question: "2 + 2?", options: ["3", "4", "5", "6"], correctOption: "b", explanation: "4" }] });
await requestAs(platform, "POST", `/exams/${exam.id}/assignments`, { studentIds: [student.id] });
const draftExams = await request("GET", "/student/exams");
if (draftExams.some((item) => item.id === exam.id)) throw new Error("draft exam leaked to student");
await requestAs(platform, "PATCH", `/exams/${exam.id}`, { published: true });
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
const duplicate = await raw(session, "POST", `/student/exams/${exam.id}/submit`, { answers: [] });
assert(duplicate.status === 409, "duplicate final submission is rejected", duplicate);
const studentB = await loginAs("e2e.student.b");
const enumerated = await raw(studentB, "GET", `/student/exams/attempts/${run.runId}`);
assert([404, 409].includes(enumerated.status), "cross-account attempt enumeration is denied", enumerated);
const guardian = await loginAs("e2e.guardian.a");
const guardianSubmit = await raw(guardian, "POST", `/student/exams/${exam.id}/submit`, { answers: [] }, "GUARDIAN");
assert(guardianSubmit.status === 403, "guardian cannot submit a student exam", guardianSubmit);
const guardianExams = await requestAs(guardian, "GET", `/guardian/students/${student.id}/exams`, undefined, "GUARDIAN");
assert(guardianExams.some((item) => item.id === exam.id && item.delivery?.state === "released" && item.delivery?.lastAttempt?.score === 100 && item.delivery?.lastAttempt?.subjectSummary?.length === 1), "guardian sees only the released result and subject summary", guardianExams);

const mock = await requestAs(platform, "POST", "/exams", {
  title: `Konkur journey ${Date.now()}`,
  subject: "تجربی",
  mode: "konkur",
  durationMinutes: 30,
  attemptLimit: 1,
  allowBackNavigation: false,
  resultPolicy: "manual",
  resultsReleased: false,
  scoring: { correct: 3, wrong: -1, unanswered: 0, negativeMarking: true },
  sections: [{ id: "biology", name: "زیست‌شناسی", questionIds: [] }, { id: "chemistry", name: "شیمی", questionIds: [] }],
  questions: [
    { question: "پرسش زیست", options: ["۱", "۲", "۳", "۴"], correctOption: "a", subject: "زیست‌شناسی", topic: "سلول", sectionId: "biology" },
    { question: "پرسش شیمی", options: ["۱", "۲", "۳", "۴"], correctOption: "b", subject: "شیمی", topic: "ساختار اتم", sectionId: "chemistry" },
  ],
});
await requestAs(platform, "POST", `/exams/${mock.id}/assignments`, { studentIds: [student.id] });
await requestAs(platform, "PATCH", `/exams/${mock.id}`, { published: true });
const firstRun = await request("POST", `/student/exams/${mock.id}/start`, {});
const resumedRun = await request("POST", `/student/exams/${mock.id}/start`, {});
assert(firstRun.runId === resumedRun.runId, "active exam resumes without creating a second attempt", resumedRun);
await request("POST", `/student/exams/${mock.id}/submit`, { answers: [
  { questionId: firstRun.quiz.questions[0].id, selectedOption: "b", visited: true, revision: 1, clientUpdatedAt: new Date().toISOString() },
  { questionId: firstRun.quiz.questions[1].id, selectedOption: "b", visited: true, revision: 1, clientUpdatedAt: new Date().toISOString() },
] });
const withheld = await request("GET", `/student/exams/attempts/${firstRun.runId}`);
assert(withheld.status === "withheld" && withheld.score === null && withheld.review === undefined, "manual policy withholds score and answer key", withheld);
const guardianWithheld = await requestAs(guardian, "GET", `/guardian/students/${student.id}/exams`, undefined, "GUARDIAN");
const guardianMock = guardianWithheld.find((item) => item.id === mock.id);
assert(guardianMock?.delivery?.state === "withheld" && guardianMock.delivery.lastAttempt?.score === null, "guardian cannot see an unreleased score or answer key", guardianMock);
await requestAs(platform, "PATCH", `/exams/${mock.id}`, { resultsReleased: true });
const released = await request("GET", `/student/exams/attempts/${firstRun.runId}`);
assert(released.status === "released" && released.subjects?.length === 2 && released.review?.length === 2, "released Konkur result includes subject analysis and review", released);
await request("PATCH", `/student/mistakes/question/${firstRun.quiz.questions[0].id}`, { reason: "بی‌دقتی" });

const expiredExam = await requestAs(platform, "POST", "/exams", { title: `Expired ${Date.now()}`, subject: "E2E", durationMinutes: 5, endTime: new Date(Date.now() - 1_000).toISOString(), published: true, questions: [{ question: "expired", options: ["۱", "۲", "۳", "۴"], correctOption: "a" }] });
await requestAs(platform, "POST", `/exams/${expiredExam.id}/assignments`, { studentIds: [student.id] });
const expiredStart = await raw(session, "POST", `/student/exams/${expiredExam.id}/start`, {});
assert(expiredStart.status === 409, "expired exam cannot be started", expiredStart);

const timeoutExam = await requestAs(platform, "POST", "/exams", { title: `Timeout ${Date.now()}`, subject: "E2E", durationMinutes: 5, endTime: new Date(Date.now() + 2_500).toISOString(), published: true, questions: [{ question: "timeout", options: ["۱", "۲", "۳", "۴"], correctOption: "a" }] });
await requestAs(platform, "POST", `/exams/${timeoutExam.id}/assignments`, { studentIds: [student.id] });
const timeoutRun = await request("POST", `/student/exams/${timeoutExam.id}/start`, {});
await request("PATCH", `/student/exams/attempts/${timeoutRun.runId}`, { answers: [{ questionId: timeoutRun.quiz.questions[0].id, selectedOption: "a", visited: true, revision: 1, clientUpdatedAt: new Date().toISOString() }] });
await new Promise((resolve) => setTimeout(resolve, 3_000));
const timedOut = await request("GET", `/student/exams/${timeoutExam.id}/progress`);
assert(timedOut.id === timeoutRun.runId && timedOut.finishedAt, "server finalizes an expired active attempt", timedOut);
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
