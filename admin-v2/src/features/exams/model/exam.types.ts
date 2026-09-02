export type RetryRequest = {
  id: string;
  examTitle?: string;
  reason?: string;
  message?: string;
  createdAt?: string;
  created_at?: string;
  status?:
    | "pending"
    | "approved"
    | "rejected";
  advisor_note?: string;
};

export type SyllabusDraft = {
  subject: string;
  description: string;
  track: string;
  required: boolean;
};

export type ExamFilterStatus =
  | "all"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

export type ExamVisibilityFilter =
  | "all"
  | "published"
  | "draft";

export type BulkExamAction =
  | "publish"
  | "draft"
  | "delete";
