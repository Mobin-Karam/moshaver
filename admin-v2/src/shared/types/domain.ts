export type RoleCode = "STUDENT" | "GUARDIAN" | "ADVISOR" | "TEACHER" | "MENTOR" | "CONTENT_MANAGER" | "ORGANIZATION_ADMIN" | "PLATFORM_ADMIN";
export type Role = "admin" | "student" | "ADMIN" | "STUDENT" | RoleCode | Lowercase<RoleCode>;

export interface User {
  id: string;
  username?: string;
  displayName?: string;
  display_name?: string;
  role: Role;
  csrfToken?: string;
}

export interface OrganizationSummary { id: string; membershipId: string; name: string; type: string; }
export interface WorkContext { role: RoleCode; capabilities: string[]; }
export interface AccountContext { user: User; roles: RoleCode[]; capabilities: string[]; workContexts?: WorkContext[]; memberships: OrganizationSummary[]; activeOrganization: OrganizationSummary | null; availableOrganizations: OrganizationSummary[]; }

export interface Student {
  id: string;
  name: string;
  user?: { id: string; username?: string; role?: Role };
  username?: string;
  grade?: string;
  major?: string;
  targetUniversity?: string;
  targetField?: string;
  targetRank?: string;
  daily_capacity?: string;
  dailyCapacity?: string;
  target_major?: string;
  target_city?: string;
  rank_goal?: string;
  active?: number | boolean;
  account_status?: "active" | "inactive" | "archived";
  accountStatus?: "active" | "inactive" | "archived";
  account_active?: number | boolean;
  last_seen_at?: string;
  attempt_count?: number;
  average_percent?: number;
  due_learning_count?: number;
  today_study_minutes?: number;
}

export interface PlanTask {
  id: string;
  start?: string;
  end?: string;
  startTime?: string;
  endTime?: string;
  type: string;
  subject?: string;
  title?: string;
  pages?: string;
  testCount?: number;
  duration?: number;
  note?: string;
  examId?: string | null;
  quizId?: string | null;
  sortOrder?: number;
  completedAt?: string | null;
  completion?: {
    status?: "done" | "partial" | string;
    actualMinutes?: number;
    actualTests?: number;
    note?: string;
  } | null;
}

export interface Plan {
  id: string;
  date?: string;
  planDate: string;
  persianDate?: string;
  jalaliId?: string;
  dayLabel?: string;
  title?: string;
  motivationText?: string;
  published: boolean;
  tasks: PlanTask[];
}

export interface Exam {
  id: string;
  title: string;
  persianDate?: string;
  isoDate: string;
  note?: string;
  status?: "upcoming" | "active" | "completed" | "cancelled";
  instructions?: string;
  openAt?: string;
  closeAt?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  published?: boolean;
  syllabus?: Array<{
    id: string;
    subject: string;
    description: string;
    track?: string;
    required?: boolean;
  }>;
  delivery?: {
    reason?: string;
    attemptsUsed?: number;
    allowedAttempts?: number;
    questionCount?: number;
  };
}

export interface Conversation {
  id: string;
  type?: "direct" | "group";
  title?: string;
  description?: string;
  role?: "owner" | "admin" | "member";
  muted?: boolean;
  memberCount?: number;
  unread?: number;
  student?: Student;
  lastMessage?: { id?: string; text?: string; type?: string; createdAt?: string; senderRole?: Role; senderName?: string };
  presence?: { online?: boolean; state?: string };
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderRole: Role;
  createdAt?: string;
  senderUserId?: string;
  senderName?: string;
  seen?: boolean;
  pending?: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  type?: string;
  payload?: Record<string, unknown>;
  replyToId?: string | null;
  pinnedAt?: string | null;
  reactions?: Array<{ emoji: string; count: number; reacted?: boolean }>;
  mentionUserIds?: string[];
}
