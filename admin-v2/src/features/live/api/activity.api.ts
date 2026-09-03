import { api } from "../../../shared/api/api";

export function getStudentActivity(id: string, limit = 100) {
  return api.get<unknown[]>(
    `/admin/activity?studentId=${id}&limit=${limit}`,
  );
}

export function getLiveStudent(id: string) {
  return api.get<Record<string, unknown>>(
    `/admin/live?studentId=${id}`,
  );
}
