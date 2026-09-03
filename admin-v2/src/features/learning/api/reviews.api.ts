import { api } from "../../../shared/api/api";

export type ReviewQueueItem = {
  id: string;
  title: string;
  studentId: string;
  dueAt: string;
  priority?: "high" | "medium" | "low";
  status?: string;
};

export const getReviewQueue = (studentId?: string) =>
  api.get<ReviewQueueItem[]>(
    studentId
      ? `/admin/reviews?studentId=${studentId}`
      : "/admin/reviews",
  );
