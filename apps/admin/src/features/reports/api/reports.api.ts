import { api } from "../../../shared/api/api";
export type ReportRow = Record<string, unknown>;
export function getReports(studentId: string, from: string, to: string) {
  return api.get<ReportRow[]>(`/students/${studentId}/reports?from=${from}&to=${to}`);
}
