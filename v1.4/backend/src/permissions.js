"use strict";

var ROLE_PERMISSIONS = {
  admin: ["*"],
  advisor: [
    "students:view-assigned",
    "students:manage-assigned",
    "plans:manage-assigned",
    "reports:view-assigned",
    "exams:manage-assigned",
    "chat:advisor",
    "subjects:manage",
  ],
  teacher: [
    "students:view-assigned",
    "reports:view-assigned",
    "exams:manage-assigned-subjects",
    "chat:advisor",
    "subjects:view",
  ],
  student: [
    "profile:view-own",
    "plans:view-own",
    "tasks:update-own",
    "reports:manage-own",
    "exams:take",
    "chat:student",
    "notifications:view-own",
  ],
  guardian: [
    "students:view-linked",
    "plans:view-linked-student",
    "reports:view-linked-student",
    "exams:view-linked-student",
    "chat:guardian",
  ],
};

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[normalizeRole(role)] || [];
}

function hasPermission(user, permission) {
  var permissions = permissionsForRole(user && user.role);
  return permissions.indexOf("*") >= 0 || permissions.indexOf(permission) >= 0;
}

function hasRole(user, roles) {
  if (!roles || !roles.length) return true;
  return roles.indexOf(normalizeRole(user && user.role)) >= 0;
}

function canAccessStudent(db, user, studentId) {
  var role = normalizeRole(user && user.role);
  var sid = String(studentId || "");
  if (!user || !sid) return false;
  if (role === "admin") return true;
  if (role === "student") return user.student_id === sid;
  if (role === "advisor") {
    return !!db
      .prepare("SELECT 1 FROM advisor_students WHERE advisor_id=? AND student_id=?")
      .get(user.id, sid);
  }
  if (role === "teacher") {
    return !!db
      .prepare("SELECT 1 FROM teacher_students WHERE teacher_id=? AND student_id=?")
      .get(user.id, sid);
  }
  if (role === "guardian") {
    return !!db
      .prepare("SELECT 1 FROM student_guardians WHERE guardian_id=? AND student_id=?")
      .get(user.id, sid);
  }
  return false;
}

module.exports = {
  ROLE_PERMISSIONS: ROLE_PERMISSIONS,
  permissionsForRole: permissionsForRole,
  hasPermission: hasPermission,
  hasRole: hasRole,
  canAccessStudent: canAccessStudent,
};
