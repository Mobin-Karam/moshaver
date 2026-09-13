const base = (process.env.E2E_API_URL || "http://127.0.0.1:4000/api/v2").replace(/\/$/, "");
const seedPassword = process.env.E2E_PASSWORD || "Moshaver-e2e-2026!";
const signupPassword = "Student-signup-2026!";
const signupUsername = `signup.${Date.now()}`;

function assert(condition, name, evidence) {
  if (!condition) throw new Error(`${name}: ${JSON.stringify(evidence)}`);
  console.log(`PASS ${name}`);
}

async function raw(method, path, { body, session, role, organizationId } = {}) {
  const headers = { accept: "application/json" };
  if (session) headers.cookie = session.cookie;
  if (role) headers["x-work-role"] = role;
  if (organizationId) headers["x-organization-id"] = organizationId;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    if (session) headers["x-csrf-token"] = session.csrf;
  }
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, payload: await response.json().catch(() => null), response };
}

async function login(username, password = seedPassword) {
  const result = await raw("POST", "/auth/login", { body: { username, password } });
  assert(result.status === 201 && result.payload?.ok, `${username} can login`, result);
  return { cookie: result.response.headers.getSetCookie()[0].split(";")[0], csrf: result.payload.data.csrfToken };
}

async function request(method, path, options) {
  const result = await raw(method, path, options);
  assert(result.status >= 200 && result.status < 300 && result.payload?.ok, `${method} ${path}`, result);
  return result.payload.data;
}

const signupBody = { username: signupUsername, password: signupPassword, name: "دانش‌آموز ثبت‌نامی", grade: "دوازدهم", major: "تجربی" };
const signup = await raw("POST", "/onboarding/student-signup", { body: signupBody });
assert(signup.status === 201 && signup.payload?.data?.onboardingStatus === "PENDING_ASSIGNMENT", "student self-signup enters pending assignment", signup);
const duplicate = await raw("POST", "/onboarding/student-signup", { body: signupBody });
assert(duplicate.status === 409 && duplicate.payload?.error?.code === "USERNAME_EXISTS", "duplicate signup is rejected", duplicate);

const studentSession = await login(signupUsername, signupPassword);
const studentContext = await request("GET", "/me/context", { session: studentSession, role: "STUDENT" });
assert(studentContext.roles.includes("STUDENT") && studentContext.availableOrganizations.length === 0, "new student has only student access before assignment", studentContext);
const student = await request("GET", "/students/me", { session: studentSession, role: "STUDENT" });
assert(student.id === signup.payload.data.id && student.onboardingStatus === "PENDING_ASSIGNMENT", "student profile exposes pending onboarding state", student);

const advisorSession = await login("e2e.advisor.a");
const forbiddenQueue = await raw("GET", "/onboarding/students/pending", { session: advisorSession, role: "ADVISOR" });
assert(forbiddenQueue.status === 403, "advisor cannot manage onboarding queue", forbiddenQueue);

const platform = await login("e2e.platform");
const pending = await request("GET", "/onboarding/students/pending", { session: platform, role: "PLATFORM_ADMIN" });
assert(pending.some((item) => item.id === student.id), "platform admin sees new student in queue", pending);
const organizations = await request("GET", "/organizations", { session: platform, role: "PLATFORM_ADMIN" });
const users = await request("GET", "/users?role=ADVISOR&status=ACTIVE", { session: platform, role: "PLATFORM_ADMIN" });
const orgA = organizations.find((item) => item.name === "E2E Organization A");
const advisorA = users.find((item) => item.username === "e2e.advisor.a");
const advisorB = users.find((item) => item.username === "e2e.advisor.b");
assert(orgA && advisorA && advisorB, "assignment options are available from API v2", { orgA, advisorA, advisorB });

const invalidAssignment = await raw("POST", `/onboarding/students/${student.id}/assign`, { session: platform, role: "PLATFORM_ADMIN", body: { mode: "MANUAL", organizationId: orgA.id, advisorUserId: advisorB.id } });
assert(invalidAssignment.status === 400 && invalidAssignment.payload?.error?.code === "INVALID_ADVISOR", "advisor from another organization is rejected", invalidAssignment);
const assignment = await request("POST", `/onboarding/students/${student.id}/assign`, { session: platform, role: "PLATFORM_ADMIN", body: { mode: "MANUAL", organizationId: orgA.id, advisorUserId: advisorA.id } });
assert(assignment.onboardingStatus === "ASSIGNED" && assignment.conversationId, "platform assigns organization and advisor with direct chat", assignment);

const assignedContext = await request("GET", "/me/context", { session: studentSession, role: "STUDENT" });
assert(assignedContext.availableOrganizations.some((item) => item.id === orgA.id), "existing student session gains assigned organization", assignedContext);
const relationships = await request("GET", `/students/${student.id}/relationships`, { session: studentSession, role: "STUDENT" });
assert(relationships.some((item) => item.type === "ADVISOR_OF" && item.fromUser.id === advisorA.id && item.organizationId === orgA.id), "student can see assigned advisor", relationships);
const studentChats = await request("GET", "/chat/conversations", { session: studentSession, role: "STUDENT" });
assert(studentChats.some((item) => item.id === assignment.conversationId), "student can open advisor conversation", studentChats);
const advisorChats = await request("GET", "/chat/conversations", { session: advisorSession, role: "ADVISOR", organizationId: orgA.id });
assert(advisorChats.some((item) => item.id === assignment.conversationId), "advisor can open student conversation", advisorChats);
const after = await request("GET", "/onboarding/students/pending", { session: platform, role: "PLATFORM_ADMIN" });
assert(!after.some((item) => item.id === student.id), "assigned student leaves onboarding queue", after);

console.log("Student self-signup and advisor assignment E2E passed.");
