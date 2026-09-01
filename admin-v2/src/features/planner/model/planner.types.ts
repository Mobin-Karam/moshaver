import type { Plan } from "../../../shared/types/domain";

export type PlannerMode = "day" | "week" | "month" | "list";
export type TaskFilter = "all" | "published" | "draft" | "incomplete";
export type PlanDraft = Pick<Plan, "planDate" | "title" | "dayLabel" | "persianDate" | "jalaliId" | "motivationText" | "published">;
export type TaskDraft = {
  start: string;
  end: string;
  type: string;
  subject: string;
  title: string;
  pages: string;
  testCount: number;
  note: string;
  examId: string;
  sortOrder: number;
};
