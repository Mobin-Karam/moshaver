import { api } from "../../../shared/api/api";

export const getStudentActivity = (
  id:string,
  limit = 300,
) =>
  api.get<unknown[]>(
    `/admin/activity?studentId=${id}&limit=${limit}`,
  );

export const getStudentWeeklyProgress = (
  id:string,
) =>
  api.get<Record<string,unknown>>(
    `/admin/students/${id}/progress/weekly`,
  );

export const getStudentTopicPerformance = (
  id:string,
) =>
  api.get<unknown[]>(
    `/admin/students/${id}/performance/topics?limit=20`,
  );
