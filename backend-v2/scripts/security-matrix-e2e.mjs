const base = (
  process.env.E2E_API_URL || "http://127.0.0.1:4000/api/v2"
).replace(/\/$/, "");
const password = process.env.E2E_PASSWORD || "Moshaver-e2e-2026!";

async function login(username) {
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await response.json();
  assert(
    response.status === 201,
    `${username} login`,
    response.status,
    201,
    payload,
  );
  return {
    cookie: response.headers.getSetCookie()[0].split(";")[0],
    csrf: payload.data.csrfToken,
  };
}

async function request(
  session,
  path,
  { method = "GET", body, role, organizationId } = {},
) {
  const headers = { cookie: session.cookie };
  if (role) headers["x-work-role"] = role;
  if (organizationId) headers["x-organization-id"] = organizationId;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    headers["x-csrf-token"] = session.csrf;
  }
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function assert(condition, name, actual, expected, payload) {
  if (!condition)
    throw new Error(
      `${name}: expected ${expected}, received ${actual}: ${JSON.stringify(payload)}`,
    );
  console.log(`PASS ${name}: ${actual}`);
}

const platform = await login("e2e.platform");
const students = await request(platform, "/students", {
  role: "PLATFORM_ADMIN",
});
assert(
  students.status === 200,
  "platform lists students",
  students.status,
  200,
  students.payload,
);
const studentA = students.payload.data.find(
  (item) => item.name === "Student A",
);
const studentB = students.payload.data.find(
  (item) => item.name === "Student B",
);
const organizations = await request(platform, "/organizations", {
  role: "PLATFORM_ADMIN",
});
const orgA = organizations.payload.data.find((item) => item.name.endsWith("A"));
const orgB = organizations.payload.data.find((item) => item.name.endsWith("B"));

const teacherA = await login("e2e.teacher.a");
const scopedTeacherSubjects = await request(teacherA, "/subjects", {
  role: "TEACHER",
  organizationId: orgA.id,
});
assert(
  scopedTeacherSubjects.status === 200 &&
    scopedTeacherSubjects.payload.data.some(
      (item) => item.name === "Subject A",
    ) &&
    !scopedTeacherSubjects.payload.data.some(
      (item) => item.name === "Subject B",
    ),
  "teacher sees only explicitly assigned subjects",
  scopedTeacherSubjects.status,
  "200/scoped",
  scopedTeacherSubjects.payload,
);

for (const [username, role] of [
  ["e2e.guardian.a", "GUARDIAN"],
  ["e2e.advisor.a", "ADVISOR"],
  ["e2e.teacher.a", "TEACHER"],
  ["e2e.mentor.a", "MENTOR"],
]) {
  const session = await login(username);
  const own = await request(session, "/students", {
    role,
    organizationId: orgA.id,
  });
  assert(
    own.status === 200 &&
      own.payload.data.length === 1 &&
      own.payload.data[0].id === studentA.id,
    `${role} sees only related student`,
    `${own.status}/${own.payload.data?.length}`,
    "200/1",
    own.payload,
  );
  const unrelated = await request(session, `/students/${studentB.id}`, {
    role,
    organizationId: orgA.id,
  });
  assert(
    unrelated.status === 404,
    `${role} cannot enumerate unrelated student`,
    unrelated.status,
    404,
    unrelated.payload,
  );
  const users = await request(session, "/users", {
    role,
    organizationId: orgA.id,
  });
  assert(
    users.status === 403,
    `${role} cannot access user administration`,
    users.status,
    403,
    users.payload,
  );
}

const content = await login("e2e.content.a");
assert(
  (
    await request(content, "/subjects", {
      role: "CONTENT_MANAGER",
      organizationId: orgA.id,
    })
  ).status === 200,
  "content manager reads subjects",
  200,
  200,
);
const contentPrivate = await request(content, `/students/${studentA.id}`, {
  role: "CONTENT_MANAGER",
  organizationId: orgA.id,
});
assert(
  contentPrivate.status === 403,
  "content role grants no private student access",
  contentPrivate.status,
  403,
  contentPrivate.payload,
);
const ownQuiz = await request(content, "/quizzes", {
  method: "POST",
  role: "CONTENT_MANAGER",
  organizationId: orgA.id,
  body: { title: `Org A quiz ${Date.now()}`, organizationId: orgA.id },
});
assert(
  ownQuiz.status === 201,
  "content manager creates quiz in own organization",
  ownQuiz.status,
  201,
  ownQuiz.payload,
);
const otherQuiz = await request(platform, "/quizzes", {
  method: "POST",
  role: "PLATFORM_ADMIN",
  body: { title: `Org B quiz ${Date.now()}`, organizationId: orgB.id },
});
assert(
  otherQuiz.status === 201,
  "platform creates cross-organization fixture",
  otherQuiz.status,
  201,
  otherQuiz.payload,
);
const scopedQuizzes = await request(content, "/quizzes", {
  role: "CONTENT_MANAGER",
  organizationId: orgA.id,
});
assert(
  scopedQuizzes.status === 200 &&
    scopedQuizzes.payload.data.some(
      (item) => item.id === ownQuiz.payload.data.id,
    ) &&
    !scopedQuizzes.payload.data.some(
      (item) => item.id === otherQuiz.payload.data.id,
    ),
  "quiz list is organization scoped",
  scopedQuizzes.status,
  "200/scoped",
  scopedQuizzes.payload,
);
const crossQuiz = await request(
  content,
  `/quizzes/${otherQuiz.payload.data.id}/questions`,
  { role: "CONTENT_MANAGER", organizationId: orgA.id },
);
assert(
  crossQuiz.status === 404,
  "content manager cannot enumerate other organization quiz",
  crossQuiz.status,
  404,
  crossQuiz.payload,
);
const forgedQuiz = await request(content, "/quizzes", {
  method: "POST",
  role: "CONTENT_MANAGER",
  organizationId: orgA.id,
  body: { title: "forged", organizationId: orgB.id },
});
assert(
  forgedQuiz.status === 404,
  "quiz organization mass assignment is rejected",
  forgedQuiz.status,
  404,
  forgedQuiz.payload,
);

const orgAdmin = await login("e2e.orgadmin.a");
assert(
  (
    await request(orgAdmin, `/students/${studentA.id}`, {
      role: "ORGANIZATION_ADMIN",
      organizationId: orgA.id,
    })
  ).status === 200,
  "org admin accesses own organization",
  200,
  200,
);
const crossStudent = await request(orgAdmin, `/students/${studentB.id}`, {
  role: "ORGANIZATION_ADMIN",
  organizationId: orgA.id,
});
assert(
  crossStudent.status === 404,
  "org admin cannot enumerate other organization student",
  crossStudent.status,
  404,
  crossStudent.payload,
);
const crossOrg = await request(orgAdmin, `/organizations/${orgB.id}`, {
  role: "ORGANIZATION_ADMIN",
  organizationId: orgB.id,
});
assert(
  crossOrg.status === 403,
  "org admin cannot select other organization",
  crossOrg.status,
  403,
  crossOrg.payload,
);
const scopedRelationships = await request(orgAdmin, "/relationships", {
  role: "ORGANIZATION_ADMIN",
  organizationId: orgA.id,
});
assert(
  scopedRelationships.status === 200 &&
    scopedRelationships.payload.data.some((item) => item.student?.id === studentA.id) &&
    !scopedRelationships.payload.data.some((item) => item.student?.id === studentB.id),
  "org admin relationship list is organization scoped",
  scopedRelationships.status,
  "200/scoped",
  scopedRelationships.payload,
);

const student = await login("e2e.student.a");
const staffApi = await request(student, "/users", {
  role: "STUDENT",
  organizationId: orgA.id,
});
assert(
  staffApi.status === 403,
  "student cannot access staff API",
  staffApi.status,
  403,
  staffApi.payload,
);
const otherStudent = await request(student, `/students/${studentB.id}`, {
  role: "STUDENT",
  organizationId: orgA.id,
});
assert(
  otherStudent.status === 403,
  "student cannot access other student profile",
  otherStudent.status,
  403,
  otherStudent.payload,
);

const advisorChat = await login("e2e.advisor.a");
const directConversation = await request(advisorChat, "/chat/conversations", {
  method: "POST",
  role: "ADVISOR",
  organizationId: orgA.id,
  body: { peerUserId: studentA.user.id },
});
assert(
  directConversation.status === 201,
  "advisor creates policy-approved student conversation",
  directConversation.status,
  201,
  directConversation.payload,
);
const sentMessage = await request(
  advisorChat,
  `/chat/conversations/${directConversation.payload.data.id}/messages`,
  {
    method: "POST",
    role: "ADVISOR",
    organizationId: orgA.id,
    body: { text: "Scoped E2E message" },
  },
);
assert(
  sentMessage.status === 201,
  "conversation member sends message",
  sentMessage.status,
  201,
  sentMessage.payload,
);
const studentMessages = await request(
  student,
  `/chat/conversations/${directConversation.payload.data.id}/messages`,
  { role: "STUDENT" },
);
assert(
  studentMessages.status === 200 &&
    studentMessages.payload.data.some(
      (item) => item.id === sentMessage.payload.data.id,
    ),
  "student receives only member conversation messages",
  studentMessages.status,
  200,
  studentMessages.payload,
);
const advisorB = await login("e2e.advisor.b");
const chatBypass = await request(
  advisorB,
  `/chat/conversations/${directConversation.payload.data.id}/messages`,
  { role: "ADVISOR", organizationId: orgB.id },
);
assert(
  chatBypass.status === 404,
  "chat membership bypass is rejected",
  chatBypass.status,
  404,
  chatBypass.payload,
);

const multi = await login("e2e.multi");
const context = await request(multi, "/me/context");
assert(
  context.status === 200 &&
    context.payload.data.roles.includes("ADVISOR") &&
    context.payload.data.roles.includes("TEACHER"),
  "multi-role context advertises both roles",
  context.status,
  200,
  context.payload,
);
const advisorSubjects = await request(multi, "/subjects", {
  role: "ADVISOR",
  organizationId: orgA.id,
});
assert(
  advisorSubjects.status === 403,
  "advisor context does not inherit teacher capability",
  advisorSubjects.status,
  403,
  advisorSubjects.payload,
);
const teacherSubjects = await request(multi, "/subjects", {
  role: "TEACHER",
  organizationId: orgA.id,
});
assert(
  teacherSubjects.status === 200,
  "teacher context receives teacher capability",
  teacherSubjects.status,
  200,
  teacherSubjects.payload,
);
const invalidContext = await request(multi, "/students", {
  role: "PLATFORM_ADMIN",
  organizationId: orgA.id,
});
assert(
  invalidContext.status === 403,
  "unassigned work context is rejected",
  invalidContext.status,
  403,
  invalidContext.payload,
);

const csrfSession = await login("e2e.advisor.a");
const csrfBypass = await fetch(`${base}/auth/logout`, {
  method: "POST",
  headers: { cookie: csrfSession.cookie, "content-type": "application/json" },
  body: "{}",
});
assert(
  csrfBypass.status === 403,
  "authenticated mutation requires CSRF",
  csrfBypass.status,
  403,
  await csrfBypass.json().catch(() => null),
);

const invalidId = await request(platform, "/students/not-a-uuid", {
  role: "PLATFORM_ADMIN",
});
assert(
  [400, 404].includes(invalidId.status),
  "invalid identifiers fail closed",
  invalidId.status,
  "400/404",
  invalidId.payload,
);
const massAssignment = await request(orgAdmin, `/students/${studentA.id}`, {
  method: "PATCH",
  role: "ORGANIZATION_ADMIN",
  organizationId: orgA.id,
  body: {
    role: "PLATFORM_ADMIN",
    permissions: ["system.manage"],
    organizationId: orgB.id,
    studentId: studentB.id,
    userId: studentB.user.id,
    relationshipType: "GUARDIAN_OF",
  },
});
assert(
  massAssignment.status === 400,
  "student DTO rejects privilege fields",
  massAssignment.status,
  400,
  massAssignment.payload,
);

const unassignedExam = await request(platform, "/exams", {
  method: "POST",
  role: "PLATFORM_ADMIN",
  body: {
    title: `Unassigned security exam ${Date.now()}`,
    organizationId: orgB.id,
    published: true,
  },
});
assert(
  unassignedExam.status === 201,
  "platform creates unassigned exam fixture",
  unassignedExam.status,
  201,
  unassignedExam.payload,
);
const examBypass = await request(
  student,
  `/student/exams/${unassignedExam.payload.data.id}`,
  { role: "STUDENT" },
);
assert(
  examBypass.status === 404,
  "student cannot bypass exam assignment",
  examBypass.status,
  404,
  examBypass.payload,
);

const relationships = await request(platform, "/relationships", {
  role: "PLATFORM_ADMIN",
});
const advisorRelationship = relationships.payload.data.find(
  (item) =>
    item.type === "ADVISOR_OF" &&
    item.student?.id === studentA.id &&
    item.fromUser?.username === "e2e.advisor.a",
);
assert(
  Boolean(advisorRelationship),
  "advisor relationship fixture exists",
  advisorRelationship?.id || "missing",
  "relationship id",
  relationships.payload,
);
const revokeRelationship = await request(
  platform,
  `/relationships/${advisorRelationship.id}`,
  { method: "PATCH", role: "PLATFORM_ADMIN", body: { status: "REVOKED" } },
);
assert(
  revokeRelationship.status === 200,
  "platform revokes advisor relationship",
  revokeRelationship.status,
  200,
  revokeRelationship.payload,
);
const revokedAccess = await request(advisorChat, `/students/${studentA.id}`, {
  role: "ADVISOR",
  organizationId: orgA.id,
});
assert(
  revokedAccess.status === 404,
  "revoked relationship invalidates access immediately",
  revokedAccess.status,
  404,
  revokedAccess.payload,
);
const restoreRelationship = await request(
  platform,
  `/relationships/${advisorRelationship.id}`,
  { method: "PATCH", role: "PLATFORM_ADMIN", body: { status: "ACTIVE" } },
);
assert(
  restoreRelationship.status === 200,
  "relationship fixture restored",
  restoreRelationship.status,
  200,
  restoreRelationship.payload,
);

const deactivate = await request(
  platform,
  `/students/${studentA.id}/deactivate`,
  { method: "POST", role: "PLATFORM_ADMIN", body: {} },
);
assert(
  deactivate.status === 201,
  "platform deactivates student",
  deactivate.status,
  201,
  deactivate.payload,
);
const deactivatedSession = await request(student, "/auth/me");
assert(
  deactivatedSession.status === 401,
  "deactivated account loses session authorization",
  deactivatedSession.status,
  401,
  deactivatedSession.payload,
);
const restoreStudent = await request(
  platform,
  `/students/${studentA.id}/restore`,
  { method: "POST", role: "PLATFORM_ADMIN", body: {} },
);
assert(
  restoreStudent.status === 201,
  "student fixture restored",
  restoreStudent.status,
  201,
  restoreStudent.payload,
);
const freshStudent = await login("e2e.student.a");
const secondStudentSession = await login("e2e.student.a");
const secondSessionList = await request(
  secondStudentSession,
  "/auth/sessions",
  { role: "STUDENT" },
);
const secondSessionId = secondSessionList.payload.data.find(
  (item) => item.current,
).id;
const revokeCurrent = await request(
  freshStudent,
  `/auth/sessions/${secondSessionId}`,
  { method: "DELETE", role: "STUDENT", body: {} },
);
assert(
  revokeCurrent.status === 200,
  "student revokes another own session",
  revokeCurrent.status,
  200,
  revokeCurrent.payload,
);
const revokedSession = await request(secondStudentSession, "/auth/me");
assert(
  revokedSession.status === 401,
  "revoked session cannot be reused",
  revokedSession.status,
  401,
  revokedSession.payload,
);

const malformed = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{",
});
const malformedPayload = await malformed.text();
assert(
  malformed.status === 400 && !/stack|\/home\//i.test(malformedPayload),
  "malformed JSON returns a safe error",
  malformed.status,
  400,
  malformedPayload,
);
const huge = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    username: "x",
    password: "x".repeat(65 * 1024 * 1024),
  }),
});
const hugePayload = await huge.text();
assert(
  huge.status === 413 && !/stack|\/home\//i.test(hugePayload),
  "oversized request is rejected without path leakage",
  huge.status,
  413,
  hugePayload.slice(0, 500),
);

console.log("Security matrix E2E passed.");
