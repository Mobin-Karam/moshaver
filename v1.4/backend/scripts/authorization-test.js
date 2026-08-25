"use strict";

var sqlite = require("node:sqlite");
var permissions = require("../src/permissions");

var db = new sqlite.DatabaseSync(":memory:");

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

db.exec(
  [
    "CREATE TABLE advisor_students (advisor_id TEXT NOT NULL, student_id TEXT NOT NULL);",
    "CREATE TABLE teacher_students (teacher_id TEXT NOT NULL, student_id TEXT NOT NULL, subject_id TEXT);",
    "CREATE TABLE student_guardians (student_id TEXT NOT NULL, guardian_id TEXT NOT NULL, relationship TEXT);",
  ].join("\n"),
);

db.prepare(
  "INSERT INTO advisor_students (advisor_id,student_id) VALUES (?,?)",
).run("advisor_1", "student_a");
db.prepare(
  "INSERT INTO teacher_students (teacher_id,student_id,subject_id) VALUES (?,?,?)",
).run("teacher_1", "student_a", "math");
db.prepare(
  "INSERT INTO student_guardians (student_id,guardian_id,relationship) VALUES (?,?,?)",
).run("student_a", "guardian_1", "mother");

assert(
  permissions.hasPermission({ role: "admin" }, "students:manage"),
  "admin wildcard",
);
assert(
  permissions.hasPermission({ role: "student" }, "plans:view-own"),
  "student own-plan permission",
);
assert(
  !permissions.hasPermission({ role: "student" }, "students:manage"),
  "student must not manage students",
);

assert(
  permissions.canAccessStudent(
    db,
    { id: "admin_1", role: "admin" },
    "student_b",
  ),
  "admin can access any student",
);
assert(
  permissions.canAccessStudent(
    db,
    { id: "student_a_user", role: "student", student_id: "student_a" },
    "student_a",
  ),
  "student can access own student record",
);
assert(
  !permissions.canAccessStudent(
    db,
    { id: "student_a_user", role: "student", student_id: "student_a" },
    "student_b",
  ),
  "student must not access another student",
);
assert(
  permissions.canAccessStudent(
    db,
    { id: "advisor_1", role: "advisor" },
    "student_a",
  ),
  "advisor can access assigned student",
);
assert(
  !permissions.canAccessStudent(
    db,
    { id: "advisor_1", role: "advisor" },
    "student_b",
  ),
  "advisor must not access unassigned student",
);
assert(
  permissions.canAccessStudent(
    db,
    { id: "teacher_1", role: "teacher" },
    "student_a",
  ),
  "teacher can access assigned student",
);
assert(
  !permissions.canAccessStudent(
    db,
    { id: "teacher_1", role: "teacher" },
    "student_b",
  ),
  "teacher must not access unassigned student",
);
assert(
  permissions.canAccessStudent(
    db,
    { id: "guardian_1", role: "guardian" },
    "student_a",
  ),
  "guardian can access linked student",
);
assert(
  !permissions.canAccessStudent(
    db,
    { id: "guardian_1", role: "guardian" },
    "student_b",
  ),
  "guardian must not access unlinked student",
);

db.close();
console.log("authorization isolation checks passed");
