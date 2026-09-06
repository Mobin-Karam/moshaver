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
  activeAttemptId?: ID | null;
  state?: 'upcoming' | 'available' | 'active' | 'submitted' | 'calculating' | 'released' | 'withheld' | 'closed';
}

export type ExamMode = 'standard' | 'konkur';
export type ExamResultPolicy = 'immediate' | 'scheduled' | 'manual';

export interface ExamSection {
  id: ID;
  name: string;
  questionIds: ID[];
  allocatedMinutes?: number;
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
  subjects?: string[];
  mode?: ExamMode;
  instructions?: string[];
  allowBackNavigation?: boolean;
  scoring?: { correct: number; wrong: number; unanswered: number; negativeMarking: boolean };
  resultPolicy?: ExamResultPolicy;
  resultReleaseAt?: string | null;
  sections?: ExamSection[];
}

export interface QuizQuestion {
  id: ID;
  question: string;
  options: [string, string, string, string];
  sectionId?: ID;
  subject?: string;
  topic?: string;
  mediaUrl?: string;
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
  deadlineAt?: string;
  serverTime?: string;
  savedAnswers?: AttemptAnswer[];
  allowBackNavigation?: boolean;
  sections?: ExamSection[];
}

export type AnswerSaveState = 'local' | 'saving' | 'saved' | 'queued' | 'failed';

export interface AttemptAnswer {
  questionId: ID;
  selectedOption: 'a' | 'b' | 'c' | 'd' | null;
  marked?: boolean;
  visited?: boolean;
  clientUpdatedAt: string;
  revision: number;
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
