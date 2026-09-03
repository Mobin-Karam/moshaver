import { api } from "../../../shared/api/api";

export type ReportSummary = {
  students?: number;
  reports?: number;
  averageFocus?: number;
  averageMotivation?: number;
  averageFatigue?: number;
};

export const getReportsSummary = (
  from: string,
  to: string,
  studentId?: string,
) =>
  api.get<ReportSummary>(
    `/admin/reports?from=${from}&to=${to}${
      studentId ? `&studentId=${studentId}` : ""
    }`,
  );
