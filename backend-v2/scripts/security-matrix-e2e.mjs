const base = (process.env.E2E_API_URL || "http://127.0.0.1:4000/api/v2").replace(/\/$/, "");
const password = process.env.E2E_PASSWORD || "Moshaver-e2e-2026!";

async function login(username) {
  const response = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
  const payload = await response.json();
  assert(response.status === 201, `${username} login`, response.status, 201, payload);
  return { cookie: response.headers.getSetCookie()[0].split(";")[0], csrf: payload.data.csrfToken };
}

async function request(session, path, { method = "GET", body, role, organizationId } = {}) {
  const headers = { cookie: session.cookie };
  if (role) headers["x-work-role"] = role;
  if (organizationId) headers["x-organization-id"] = organizationId;
  if (body !== undefined) { headers["content-type"] = "application/json"; headers["x-csrf-token"] = session.csrf; }
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function assert(condition, name, actual, expected, payload) {
  if (!condition) throw new Error(`${name}: expected ${expected}, received ${actual}: ${JSON.stringify(payload)}`);
  console.log(`PASS ${name}: ${actual}`);
}

const platform = await login("e2e.platform");
const students = await request(platform, "/students", { role: "PLATFORM_ADMIN" });
assert(students.status === 200, "platform lists students", students.status, 200, students.payload);
const studentA = students.payload.data.find((item) => item.name === "Student A");
const studentB = students.payload.data.find((item) => item.name === "Student B");
const organizations = await request(platform, "/organizations", { role: "PLATFORM_ADMIN" });
const orgA = organizations.payload.data.find((item) => item.name.endsWith("A"));
const orgB = organizations.payload.data.find((item) => item.name.endsWith("B"));

for (const [username, role] of [["e2e.guardian.a", "GUARDIAN"], ["e2e.advisor.a", "ADVISOR"], ["e2e.teacher.a", "TEACHER"], ["e2e.mentor.a", "MENTOR"]]) {
  const session = await login(username);
  const own = await request(session, "/students", { role, organizationId: orgA.id });
  assert(own.status === 200 && own.payload.data.length === 1 && own.payload.data[0].id === studentA.id, `${role} sees only related student`, `${own.status}/${own.payload.data?.length}`, "200/1", own.payload);
  const unrelated = await request(session, `/students/${studentB.id}`, { role, organizationId: orgA.id });
  assert(unrelated.status === 404, `${role} cannot enumerate unrelated student`, unrelated.status, 404, unrelated.payload);
  const users = await request(session, "/users", { role, organizationId: orgA.id });
  assert(users.status === 403, `${role} cannot access user administration`, users.status, 403, users.payload);
}

const content = await login("e2e.content.a");
assert((await request(content, "/subjects", { role: "CONTENT_MANAGER", organizationId: orgA.id })).status === 200, "content manager reads subjects", 200, 200);
const contentPrivate = await request(content, `/students/${studentA.id}`, { role: "CONTENT_MANAGER", organizationId: orgA.id });
assert(contentPrivate.status === 403, "content role grants no private student access", contentPrivate.status, 403, contentPrivate.payload);

const orgAdmin = await login("e2e.orgadmin.a");
assert((await request(orgAdmin, `/students/${studentA.id}`, { role: "ORGANIZATION_ADMIN", organizationId: orgA.id })).status === 200, "org admin accesses own organization", 200, 200);
const crossStudent = await request(orgAdmin, `/students/${studentB.id}`, { role: "ORGANIZATION_ADMIN", organizationId: orgA.id });
assert(crossStudent.status === 404, "org admin cannot enumerate other organization student", crossStudent.status, 404, crossStudent.payload);
const crossOrg = await request(orgAdmin, `/organizations/${orgB.id}`, { role: "ORGANIZATION_ADMIN", organizationId: orgB.id });
assert(crossOrg.status === 403, "org admin cannot select other organization", crossOrg.status, 403, crossOrg.payload);

const student = await login("e2e.student.a");
const staffApi = await request(student, "/users", { role: "STUDENT", organizationId: orgA.id });
assert(staffApi.status === 403, "student cannot access staff API", staffApi.status, 403, staffApi.payload);
const otherStudent = await request(student, `/students/${studentB.id}`, { role: "STUDENT", organizationId: orgA.id });
assert(otherStudent.status === 403, "student cannot access other student profile", otherStudent.status, 403, otherStudent.payload);

const multi = await login("e2e.multi");
const context = await request(multi, "/me/context");
assert(context.status === 200 && context.payload.data.roles.includes("ADVISOR") && context.payload.data.roles.includes("TEACHER"), "multi-role context advertises both roles", context.status, 200, context.payload);
const advisorSubjects = await request(multi, "/subjects", { role: "ADVISOR", organizationId: orgA.id });
assert(advisorSubjects.status === 403, "advisor context does not inherit teacher capability", advisorSubjects.status, 403, advisorSubjects.payload);
const teacherSubjects = await request(multi, "/subjects", { role: "TEACHER", organizationId: orgA.id });
assert(teacherSubjects.status === 200, "teacher context receives teacher capability", teacherSubjects.status, 200, teacherSubjects.payload);
const invalidContext = await request(multi, "/students", { role: "PLATFORM_ADMIN", organizationId: orgA.id });
assert(invalidContext.status === 403, "unassigned work context is rejected", invalidContext.status, 403, invalidContext.payload);

const csrfSession = await login("e2e.advisor.a");
const csrfBypass = await fetch(`${base}/auth/logout`, { method: "POST", headers: { cookie: csrfSession.cookie, "content-type": "application/json" }, body: "{}" });
assert(csrfBypass.status === 403, "authenticated mutation requires CSRF", csrfBypass.status, 403, await csrfBypass.json().catch(() => null));

console.log("Security matrix E2E passed.");
