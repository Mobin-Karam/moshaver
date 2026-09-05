export type ID = string;

export type TaskType =
  | 'study'
  | 'review'
  | 'test'
  | 'class'
  | 'prayer'
  | 'meal'
  | 'break'
  | 'exam';

export type TaskCompletionStatus = 'done' | 'partial' | 'skipped';
export type TaskRuntimeStatus =
  | TaskCompletionStatus
  | 'current'
  | 'overdue'
  | 'next';

export interface TaskCompletion {
  status: TaskCompletionStatus;
  actualMinutes?: number;
  actualTests?: number;
  note?: string;
}

export interface StudentTask {
  id: ID;
  type: TaskType;
  title?: string;
  subject?: string;
  start: string;
  end: string;
  pages?: string;
  testCount?: number;
  note?: string;
  quizId?: ID;
  examId?: ID;
  completion?: TaskCompletion | null;
}

export interface StudentPlan {
  id?: ID;
  title?: string;
  isoDate: string;
  persianDate?: string;
  motivationText?: string;
  tasks: StudentTask[];
}

export interface ActiveStudySession {
  id: ID;
  taskId: ID;
  startedAt: string;
}

export interface ExamDelivery {
  canStart?: boolean;
  reason?: string;
  attemptsUsed?: number;
  allowedAttempts?: number;
  questionCount?: number;
}

export interface ExamSummary {
  id: ID;
  title: string;
  isoDate?: string;
  persianDate?: string;
  openAt?: string;
  closeAt?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  delivery?: ExamDelivery;
}

export interface QuizQuestion {
  id: ID;
  question: string;
  options: [string, string, string, string];
}

export interface QuizRun {
  runId: ID;
  quiz: {
    id: ID;
    examId?: ID;
    title: string;
    durationMinutes: number;
    questions: QuizQuestion[];
  };
  startedAt: string;
  examCloseAt?: string | null;
}

export interface QuizAnswer {
  questionId: ID;
  selectedOption: 'a' | 'b' | 'c' | 'd' | null;
  errorReason?: string;
}

export interface ChatMessage {
  id: ID;
  conversationId: ID;
  senderUserId: ID;
  text: string;
  createdAt: string;
  seen?: boolean;
  deletedAt?: string | null;
}

export type { NotificationContract as NotificationItem, ApiErrorContract, SyncPullContract } from '@moshaver/api-contract';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}
