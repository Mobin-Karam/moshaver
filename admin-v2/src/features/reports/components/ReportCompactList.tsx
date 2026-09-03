import { AlertTriangle, Target } from "lucide-react";
import type { ReportRow } from "../api/reports.api";
import { reportAccuracy, reportNumber } from "../report-utils";
import { fa } from "../../../shared/lib/utils";

export function ReportCompactList({ reports, formatDate }: { reports: ReportRow[]; formatDate: (value?: string | Date) => string }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
    <table className="w-full min-w-[780px] text-sm">
      <thead className="bg-slate-50 dark:bg-slate-900/30 text-xs text-slate-500"><tr><th className="px-3 py-3 text-right">تاریخ</th><th className="px-3 text-right">مطالعه</th><th className="px-3 text-right">تست</th><th className="px-3 text-right">دقت</th><th className="px-3 text-right">تمرکز</th><th className="px-3 text-right">انگیزه</th><th className="px-3 text-right">خستگی</th><th className="px-3 text-right">یادداشت</th></tr></thead>
      <tbody>
        {reports.map((row, index) => {
          const date = row.plan_date ?? row.planDate;
          const accuracy = reportAccuracy(row);
          return <tr key={String(row.id ?? `${date}-${index}`)} className="border-t border-slate-100 hover:bg-slate-50 dark:bg-slate-900/30/70">
            <td className="whitespace-nowrap px-3 py-3 font-semibold">{date ? formatDate(String(date)) : "-"}</td>
            <td className="px-3">{fa(reportNumber(row.study_hours ?? row.studyHours))} ساعت</td>
            <td className="px-3">{fa(reportNumber(row.tests))}</td>
            <td className="px-3">{accuracy === null ? "-" : `${fa(accuracy)}٪`}</td>
            <td className="px-3">{fa(reportNumber(row.focus))}/۱۰</td>
            <td className="px-3">{fa(reportNumber(row.motivation))}/۱۰</td>
            <td className="px-3">{fa(reportNumber(row.fatigue))}/۱۰</td>
            <td className="max-w-[260px] px-3"><div className="flex min-w-0 gap-2">{row.problem ? <span title={String(row.problem)} className="inline-flex min-w-0 items-center gap-1 text-rose-700"><AlertTriangle size={14} className="shrink-0" /><span className="truncate">{String(row.problem)}</span></span> : null}{row.tomorrow ? <span title={String(row.tomorrow)} className="inline-flex min-w-0 items-center gap-1 text-indigo-700"><Target size={14} className="shrink-0" /><span className="truncate">{String(row.tomorrow)}</span></span> : null}{!row.problem && !row.tomorrow ? "-" : null}</div></td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
