import { api } from "../../../shared/api/api";

export type PlannerSummary = {
  plans: number;
  tasks: number;
  minutes: number;
  tests: number;
  publishedTasks: number;
};

export type BatchTaskUpdate = {
  id: string;
  changes: Record<string, unknown>;
};

export const getPlannerSummary = (
  studentId: string,
  from: string,
  to: string,
) =>
  api.get<PlannerSummary>(
    `/admin/plans/summary?studentId=${encodeURIComponent(studentId)}&from=${from}&to=${to}`,
  );

export const batchUpdateTasks = (
  updates: BatchTaskUpdate[],
) =>
  api.post(
    "/admin/tasks/batch",
    { updates },
  );
