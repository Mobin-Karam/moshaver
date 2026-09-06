import { api } from "../../../shared/api/api";

export function getStudentActivity(id: string, limit = 100) {
  return api.get<unknown[]>(`/students/${id}/activity?limit=${limit}`);
}

export function getLiveStudent(_id: string) {
  return api.get<Record<string, unknown>>("/live");
}
