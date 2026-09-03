import type { ReportRow } from "./api/reports.api";

export function reportNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function reportDate(report: ReportRow): string {
  const value = report.plan_date ?? report.planDate ?? report.date ?? "";
  return typeof value === "string" ? value : String(value || "");
}

export function reportText(report: ReportRow): string {
  return [report.problem, report.tomorrow, report.note, report.notes, report.description].filter(Boolean).join(" ");
}

export function reportAccuracy(report: ReportRow): number | null {
  const correct = reportNumber(report.correct);
  const wrong = reportNumber(report.wrong);
  const total = correct + wrong;
  if (!total) return null;
  return Math.round((correct / total) * 100);
}

function average(rows: ReportRow[], key: string) {
  if (!rows.length) return 0;
  const values = rows
    .map((row) => row[key])
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(reportNumber);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function summarizeReports(rows: ReportRow[]) {
  const studyHours = rows.reduce((sum, row) => sum + reportNumber(row.study_hours ?? row.studyHours), 0);
  const tests = rows.reduce((sum, row) => sum + reportNumber(row.tests), 0);
  const correct = rows.reduce((sum, row) => sum + reportNumber(row.correct), 0);
  const wrong = rows.reduce((sum, row) => sum + reportNumber(row.wrong), 0);
  const answered = correct + wrong;
  return {
    count: rows.length,
    studyHours,
    tests,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    focus: average(rows, "focus"),
    motivation: average(rows, "motivation"),
    fatigue: average(rows, "fatigue"),
  };
}
