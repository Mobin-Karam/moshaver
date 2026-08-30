export type Role = "admin" | "student" | "ADMIN" | "STUDENT";

export interface User {
  id: string;
  username?: string;
  displayName?: string;
  display_name?: string;
  role: Role;
  csrfToken?: string;
}

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
  completedAt?: string | null;
}

export interface Plan {
  id: string;
  date?: string;
  planDate: string;
  persianDate?: string;
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
  instructions?: string;
  openAt?: string;
  closeAt?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  published?: boolean;
  syllabus?: Array<{ id: string; subject: string; description: string }>;
  delivery?: {
    reason?: string;
    attemptsUsed?: number;
    allowedAttempts?: number;
    questionCount?: number;
  };
}

export interface Conversation {
  id: string;
  unread?: number;
  student?: Student;
  lastMessage?: { text?: string; createdAt?: string; senderRole?: Role };
  presence?: { online?: boolean; state?: string };
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderRole: Role;
  createdAt?: string;
}
