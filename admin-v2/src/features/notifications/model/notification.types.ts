import type {
  AdminNotification,
  PushPreferences,
  PushStatus,
} from "./notification-model";

export type NotificationContextValue = {
  items: AdminNotification[];
  unread: number;
  loading: boolean;
  error: boolean;
  errorMessage: string | null;
  forbidden: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  markingAllRead: boolean;
  soundEnabled: boolean;
  chatSoundEnabled: boolean;

  setSoundEnabled: (value: boolean) => void;
  setChatSoundEnabled: (value: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  loadMore: () => void;
  refresh: () => void;
  pushStatus: () => Promise<PushStatus>;
  enablePush: () => Promise<PushStatus>;
  disablePush: () => Promise<PushStatus>;
  savePushPreferences: (preferences: PushPreferences) => Promise<void>;
  testPush: () => Promise<void>;
  testSound: (chat?: boolean) => void;
};

export type TaskIssue = {
  id: string;
  student_id?: string;
  studentId?: string;
  task_id?: string | null;
  taskId?: string | null;
  issue_type?: string;
  issueType?: string;
  note?: string;
  status?: "open" | "resolved" | "dismissed";
  advisor_note?: string;
  advisorNote?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  subject?: string;
  title?: string;
};

export type RecoveryRequest = {
  id: string;
  student_id?: string;
  studentId?: string;
  plan_date?: string;
  planDate?: string;
  reason?: string;
  note?: string;
  status?: "pending" | "resolved" | "dismissed";
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

export type MissedTask = {
  id: string;
  subject?: string;
  title?: string;
  planDate?: string;
  start?: string;
  end?: string;
};

export type ReviewInboxItem = Record<string, unknown> & {
  id?: string;
  title?: string;
  subject?: string;
  dueDate?: string;
  due_date?: string;
};

export type ExamRetryRequest = Record<string, unknown> & {
  id?: string;
  examTitle?: string;
  reason?: string;
  created_at?: string;
  createdAt?: string;
};

export type AdvisorInbox = {
  issues?: TaskIssue[];
  recoveryRequests?: RecoveryRequest[];
  reviews?: ReviewInboxItem[];
  missedTasks?: MissedTask[];
  examRetryRequests?: ExamRetryRequest[];
};

export type AdvisorInboxRow =
  | {
      key: string;
      kind: "issue";
      type: string;
      value: TaskIssue;
      tone: "red";
      actionable: true;
    }
  | {
      key: string;
      kind: "recovery";
      type: string;
      value: RecoveryRequest;
      tone: "blue";
      actionable: true;
    }
  | {
      key: string;
      kind: "missed" | "review" | "examRetry";
      type: string;
      value: MissedTask | ReviewInboxItem | ExamRetryRequest;
      tone: "red" | "amber";
      actionable: false;
    };

export type RecoveryActionInput = {
  id: string;
  status: "resolved" | "dismissed";
  message?: string;
};

export type TaskIssueActionInput = {
  id: string;
  status: "open" | "resolved" | "dismissed";
  advisorNote?: string;
};
