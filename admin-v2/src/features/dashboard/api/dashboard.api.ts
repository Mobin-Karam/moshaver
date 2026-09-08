import { api } from "../../../shared/api/api";
import type {
  AttentionReason,
  AttentionStudent,
  RoleDashboardData,
} from "../model/dashboard.types";

type AttentionSignal = {
  type?: string;
  count?: number;
  weight?: number;
};

type V2AttentionStudent = Partial<AttentionStudent> & {
  id: string;
  name: string;
  attention?: {
    score?: number;
    signals?: AttentionSignal[];
  };
};

const signalLabels: Record<string, string> = {
  MISSED_TASKS: "فعالیت عقب‌افتاده",
  NO_RECENT_STUDY: "بدون مطالعه اخیر",
  UPCOMING_EXAM: "آزمون نزدیک",
  OPEN_RECOVERY: "درخواست ریکاوری باز",
  TASK_ISSUE: "مسئله فعالیت باز",
};

export function normalizeAttentionStudent(student: V2AttentionStudent): AttentionStudent {
  const score = Number(student.attention?.score ?? 0);
  const signals = Array.isArray(student.attention?.signals) ? student.attention.signals : [];
  const suppliedReasons = Array.isArray(student.reasons) ? student.reasons : [];
  const reasons: AttentionReason[] = suppliedReasons.length
    ? suppliedReasons
    : signals.map((signal) => ({
        code: String(signal.type || "attention_signal").toLowerCase(),
        label: signalLabels[String(signal.type)] || "نیازمند بررسی",
        value: Number(signal.count ?? 0),
      }));
  const missedTasks = signals.find((signal) => signal.type === "MISSED_TASKS");

  return {
    id: student.id,
    name: student.name,
    grade: student.grade,
    major: student.major,
    accountStatus: student.accountStatus,
    presence: student.presence,
    lastSeenAt: student.lastSeenAt ?? student.presence?.lastSeenAt ?? null,
    dueReviews: Number(student.dueReviews ?? 0),
    recentAccuracy: student.recentAccuracy ?? null,
    remainingTasks: Number(student.remainingTasks ?? missedTasks?.count ?? 0),
    reasons,
    severity: student.severity ?? (score >= 4 ? "red" : score > 0 ? "yellow" : "green"),
  };
}

export function getAdminDashboard() {
  return api.get<RoleDashboardData>("/dashboard");
}

export function getAdminAttention(limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return api
    .get<V2AttentionStudent[]>(`/attention?limit=${safeLimit}`)
    .then((students) => students.map(normalizeAttentionStudent));
}
