import type { RoleCode } from "../../../shared/types/domain";

export type RoleQuickAction = {
  to: string;
  label: string;
  capability?: string;
};

const sharedActions: Record<string, RoleQuickAction> = {
  students: { to: "/admin/students", label: "دانش‌آموزان", capability: "students.read" },
  planner: { to: "/admin/planner", label: "برنامه‌ها", capability: "plans.read" },
  learning: { to: "/admin/learning", label: "یادگیری و مرور", capability: "learning.read" },
  exams: { to: "/admin/exams", label: "آزمون‌ها", capability: "exams.read" },
  questions: { to: "/admin/questions", label: "بانک سؤال", capability: "questions.read" },
  quizzes: { to: "/admin/quizzes", label: "آزمونک‌ها", capability: "quizzes.read" },
  subjects: { to: "/admin/subjects", label: "درس‌ها", capability: "subjects.read" },
  resources: { to: "/admin/resources", label: "منابع آموزشی", capability: "learning_resources.manage" },
  chat: { to: "/admin/communication/chat", label: "گفت‌وگو", capability: "chat.read" },
  reports: { to: "/admin/reports", label: "گزارش‌ها", capability: "reports.read" },
  users: { to: "/admin/users", label: "کاربران و کارکنان", capability: "users.read" },
  organizations: { to: "/admin/organizations", label: "سازمان‌ها", capability: "organization.read" },
  onboarding: { to: "/admin/onboarding", label: "ورودی دانش‌آموزان", capability: "student_onboarding.manage" },
  system: { to: "/admin/system", label: "مرکز عملیات", capability: "system.manage" },
  audit: { to: "/admin/audit", label: "ممیزی امنیتی", capability: "audit.read" },
  settings: { to: "/admin/settings", label: "پروفایل و حساب" },
};

const roleActions: Partial<Record<RoleCode, RoleQuickAction[]>> = {
  GUARDIAN: [sharedActions.students, sharedActions.planner, sharedActions.reports, sharedActions.chat, sharedActions.settings],
  ADVISOR: [sharedActions.students, sharedActions.planner, sharedActions.learning, sharedActions.reports, sharedActions.chat, sharedActions.resources],
  TEACHER: [sharedActions.exams, sharedActions.questions, sharedActions.quizzes, sharedActions.subjects, sharedActions.students, sharedActions.resources, sharedActions.chat],
  MENTOR: [sharedActions.students, sharedActions.planner, sharedActions.reports, sharedActions.chat, sharedActions.resources],
  CONTENT_MANAGER: [sharedActions.resources, sharedActions.questions, sharedActions.quizzes, sharedActions.exams, sharedActions.subjects],
  ORGANIZATION_ADMIN: [sharedActions.students, sharedActions.users, sharedActions.organizations, sharedActions.reports, sharedActions.resources],
  PLATFORM_ADMIN: [sharedActions.onboarding, sharedActions.users, sharedActions.organizations, sharedActions.system, sharedActions.audit, sharedActions.students],
};

export function quickActionsForRole(
  role: RoleCode | null | undefined,
  capabilities: readonly string[],
) {
  const candidates = (role && roleActions[role]) || [sharedActions.settings];
  return candidates.filter(
    (action) => !action.capability || capabilities.includes(action.capability),
  );
}
