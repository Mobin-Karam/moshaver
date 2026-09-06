export type AdminDashboardSummary = {
  students: number;
  todayPlans: number;
  todayReports: number;
  upcomingExams: number;
  pendingRecoveries: number;
  refreshing?: boolean;
  onRefresh?: () => void;
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
  code:
    | "overdue_reviews"
    | "weak_exam_performance"
    | "no_recent_activity"
    | string;
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

export type RoleDashboardData = {
  context: string;
  generatedAt: string;
  assignedStudents: number;
  unreadConversations: number;
  attentionStudents?: number;
  taskIssues?: number;
  recoveryRequests?: number;
  retryRequests?: number;
  todayPlanHealth?: { plans?: number; tasks?: number; completed?: number };
  upcomingExams?: Array<{ id:string; title:string; subject?:string; startTime?:string }>;
  subjects?: number | Array<{id:string;name:string}>;
  recentExamResults?: Array<{id:string;score:number;finishedAt:string;studentId:string;title:string}>;
  studentsNeedingAttention?: number;
  contentTasks?: {questions?:number;quizzes?:number};
  recentProgress?: {plans?:number;tasks?:number;completed?:number};
  upcomingGoals?: Array<{id:string;title:string}>;
  messages?: number;
  questions?: number;
  quizzes?: number;
  exams?: number;
  draftCount?: number;
  publishedCount?: number;
  contentIssues?: unknown[];
  organizations?: number | string[];
  members?: number;
  students?: number;
  staff?: number;
  activeUsers?: number;
  inactiveUsers?: number;
  analytics?: {plans?:number};
  notices?: unknown[];
  users?: number;
  systemHealth?: {database?:string;sqlite?:boolean};
  releaseStatus?: {version?:string;environment?:string};
  auditSummary?: {events24h?:number;lockedLogins?:number};
  children?: number;
};
