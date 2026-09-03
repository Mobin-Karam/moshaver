export type AdminDashboardSummary = {
  students: number;
  todayPlans: number;
  todayReports: number;
  upcomingExams: number;
  pendingRecoveries: number;
  missedTasks: number;
  unreadChat: number;
  recentReports: DashboardRecentReport[];
};

export type DashboardRecentReport = {
  id: string;
  student_id?: string;
  studentId?: string;
  student_name?: string;
  studentName?: string;
  plan_date?: string;
  planDate?: string;
  study_hours?: string;
  studyHours?: string;
  tests?: number;
  correct?: number;
  wrong?: number;
  blank?: number;
  focus?: number;
  fatigue?: number;
  motivation?: number;
  problem?: string;
  tomorrow?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

export type AttentionSeverity = "red" | "yellow" | "green";

export type AttentionReason = {
  code: "overdue_reviews" | "weak_exam_performance" | "no_recent_activity" | string;
  value: number;
  label: string;
};

export type AttentionPresence = {
  online?: boolean;
  state?: string;
  lastSeenAt?: string | null;
  activeTaskId?: string | null;
  deviceLabel?: string | null;
};

export type AttentionStudent = {
  id: string;
  name: string;
  grade?: string;
  major?: string;
  accountStatus?: "active" | "inactive" | "archived" | string;
  lastSeenAt?: string | null;
  dueReviews: number;
  recentAccuracy: number | null;
  remainingTasks: number;
  reasons: AttentionReason[];
  severity: AttentionSeverity;
  presence?: AttentionPresence;
};

export type FollowUpMetric = {
  key: "recoveries" | "missed" | "chat" | "attention";
  label: string;
  value: number;
  description: string;
  href: string;
  tone: "red" | "amber" | "blue" | "neutral";
};
