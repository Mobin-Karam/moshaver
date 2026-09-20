export const API_VERSION = "v2" as const;
export const API_BASE_PATH = "/api/v2" as const;

export const ROLE_CODES = [
  "STUDENT",
  "GUARDIAN",
  "ADVISOR",
  "TEACHER",
  "MENTOR",
  "CONTENT_MANAGER",
  "ORGANIZATION_ADMIN",
  "PLATFORM_ADMIN",
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const CAPABILITIES = [
  "organization.read",
  "organization.manage",
  "organization.members.manage",
  "users.read",
  "users.manage",
  "students.read",
  "students.create",
  "students.update",
  "students.archive",
  "student.profile.read",
  "student.progress.read",
  "student.analytics.read",
  "student.live.read",
  "student.activity.read",
  "student.quizzes.read",
  "student_onboarding.manage",
  "guardian.students.read",
  "guardian.dashboard.read",
  "guardian.progress.read",
  "guardian.schedule.read",
  "guardian.exams.read",
  "guardian.reports.read",
  "guardian.encouragement.create",
  "subjects.read",
  "subjects.manage",
  "subjects.create",
  "subjects.update",
  "subjects.archive",
  "studentSubjects.read",
  "studentSubjects.manage",
  "learning.read",
  "learning.create",
  "learning.update",
  "learning.review",
  "learning_resources.read",
  "learning_resources.manage",
  "plans.read",
  "plans.create",
  "plans.update",
  "plans.publish",
  "plans.delete",
  "tasks.read",
  "tasks.create",
  "tasks.update",
  "tasks.delete",
  "exams.read",
  "exams.create",
  "exams.update",
  "exams.delete",
  "exams.assign",
  "exams.results.read",
  "questions.read",
  "questions.create",
  "questions.update",
  "questions.delete",
  "syllabus.manage",
  "retry_requests.read",
  "retry_requests.moderate",
  "quizzes.read",
  "quizzes.create",
  "quizzes.update",
  "quiz_questions.manage",
  "mistakes.read",
  "chat.read",
  "chat.send",
  "chat.group.create",
  "chat.group.manage",
  "chat.moderate",
  "reports.read",
  "reports.manage",
  "recovery_requests.read",
  "recovery_requests.manage",
  "analytics.read",
  "recommendations.read",
  "recommendations.manage",
  "import.preview",
  "import.commit",
  "export.read",
  "release.read",
  "release.manage",
  "audit.read",
  "system.manage",
  "database.read",
  "database.backup",
  "database.restore",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export type ApiErrorContract = {
  ok: false;
  error: { code: string; message: string; details?: unknown | null };
};
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiErrorContract;
export type CursorPage<T> = {
  items: T[];
  unreadCount?: number;
  hasMore: boolean;
  nextCursor: string | null;
};
export type NotificationContract = {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  url: string | null;
  data: Record<string, unknown> | null;
  priority: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
};
export type AccountContextContract = {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    status: string;
  };
  roles: RoleCode[];
  capabilities: Capability[];
  memberships: Array<{
    id: string;
    organization: { id: string; name: string };
    status: string;
  }>;
  activeOrganization: null | { id: string; name: string };
};
export type SyncPullContract = {
  cursor: string;
  reset: boolean;
  serverTime: string;
  plans: unknown[];
  tasks: unknown[];
  studySessions: unknown[];
  exams: unknown[];
  examAttempts: unknown[];
  notifications: NotificationContract[];
  learningItems: unknown[];
  reviews: unknown[];
};
