export type LearningStatus =
  | "pending"
  | "done"
  | "archived";

export type LearningItem = {
  id: string;
  studentId: string;
  sourceAnswerId?: string | null;
  subject: string;
  book: string;
  chapter: string;
  lesson: string;
  topic: string;
  title: string;
  note: string;
  hint: string;
  dueDate: string;
  intervalDays: number;
  reviewCount: number;
  mastery: number;
  status: LearningStatus;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LearningSummary = {
  totalItems: number;
  pendingItems: number;
  dueItems: number;
  averageMastery: number;
  attempts: number;
  averageExamPercent: number;
  lastAttemptAt?: string | null;
  subjects: Array<{
    subject: string;
    items: number;
    due: number;
    mastery: number;
  }>;
  mistakePatterns: Array<{
    subject: string;
    reason: string;
    count: number;
  }>;
};

export type LearningResponse = {
  summary: LearningSummary;
  items: LearningItem[];
};

export type LearningReview = {
  id: string;
  reviewedAt: string;
  rating: number;
  previousMastery: number;
  newMastery: number;
  previousIntervalDays: number;
  nextIntervalDays: number;
  nextReviewAt: string;
};

export function isLearningDue(
  item: LearningItem,
  today: string,
) {
  return (
    item.status === "pending" &&
    item.dueDate <= today
  );
}

export function learningStatusLabel(
  status: LearningStatus,
) {
  return (
    {
      pending: "در انتظار مرور",
      done: "تکمیل‌شده",
      archived: "بایگانی",
    } as const
  )[status];
}
