import { api } from "../../../shared/api/api";

export const getStudentActivity = (id: string, limit = 300) =>
  api.get<unknown[]>(`/students/${id}/activity?limit=${limit}`);

export const getStudentWeeklyProgress = (id: string) =>
  api.get<Record<string, unknown>>(`/students/${id}/progress/weekly`);

export const getStudentTopicPerformance = (id: string) =>
  api.get<unknown[]>(`/students/${id}/performance/topics?limit=20`);
