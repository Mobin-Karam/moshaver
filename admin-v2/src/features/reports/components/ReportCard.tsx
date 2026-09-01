import { Badge } from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import type { ReportRow } from "../api/reports.api";
export function ReportCard({ report: r, formatDate }: { report: ReportRow; formatDate: (value?: string | Date) => string }) {
  return <article className="rounded-md border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <strong>{r.plan_date || r.planDate ? formatDate(String(r.plan_date ?? r.planDate)) : "گزارش"}</strong>
      <div className="flex gap-2"><Badge tone="blue">تمرکز {fa(r.focus ?? 0)}/۱۰</Badge><Badge tone="amber">خستگی {fa(r.fatigue ?? 0)}/۱۰</Badge><Badge tone="green">انگیزه {fa(r.motivation ?? 0)}/۱۰</Badge></div>
    </div>
    <div className="mt-3 grid gap-2 text-sm md:grid-cols-4"><span>مطالعه: <strong>{fa(r.study_hours ?? 0)} ساعت</strong></span><span>تست: <strong>{fa(r.tests ?? 0)}</strong></span><span>صحیح: <strong>{fa(r.correct ?? 0)}</strong></span><span>غلط: <strong>{fa(r.wrong ?? 0)}</strong></span></div>
    {r.problem ? <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">مسئله: {String(r.problem)}</p> : null}
    {r.tomorrow ? <p className="mt-2 rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">فردا: {String(r.tomorrow)}</p> : null}
  </article>;
}
