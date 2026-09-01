export type LiveState =
  | "online"
  | "offline"
  | "studying"
  | "paused"
  | "taking_exam";

export type LiveStudent = {
  id: string;
  name: string;
  grade?: string;
  major?: string;
  state: LiveState;
  freshness:
    | "live"
    | "recent"
    | "stale"
    | "offline";
  presence?: {
    online?: boolean;
    lastSeenAt?: string;
    deviceLabel?: string;
  };
  activeSession?: {
    startedAt?: string;
    title?: string;
    subject?: string;
  };
  currentView?: string;
  dueReviews: number;
  remainingTasks: number;
  lastExamPercent: number | null;
  lastActivityAt?: string | null;
};

export type LiveEvent = {
  id: string;
  studentId: string;
  studentName: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type LiveSnapshot = {
  generatedAt?: string;
  summary?: {
    total?: number;
    online?: number;
    studying?: number;
    paused?: number;
    takingExam?: number;
    attention?: number;
  };
  students?: LiveStudent[];
  timeline?: LiveEvent[];
};

export type LiveFilter =
  | "all"
  | LiveState
  | "attention";

export type LivePanel =
  | "students"
  | "timeline";
