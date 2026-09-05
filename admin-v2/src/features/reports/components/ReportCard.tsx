import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleGauge,
  ListChecks,
  Target,
  XCircle,
} from "lucide-react";
import { Badge } from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import type { ReportRow } from "../api/reports.api";
import { reportAccuracy, reportNumber } from "../report-utils";

function Meter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "focus" | "motivation" | "fatigue";
}) {
  const safe = Math.max(0, Math.min(10, value));
  const bar =
    tone === "fatigue"
      ? "bg-amber-500"
      : tone === "motivation"
        ? "bg-emerald-500"
        : "bg-indigo-500";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">{label}</span>
        <strong className="text-ink">{fa(safe)}/۱۰</strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${safe * 10}%` }}
        />
      </div>
    </div>
  );
}

export function ReportCard({
  report: row,
  formatDate,
}: {
  report: ReportRow;
  formatDate: (value?: string | Date) => string;
}) {
  const date = row.plan_date ?? row.planDate;
  const accuracy = reportAccuracy(row);
  const study = reportNumber(row.study_hours ?? row.studyHours);
  const tests = reportNumber(row.tests);
  const correct = reportNumber(row.correct);
  const wrong = reportNumber(row.wrong);
  const focus = reportNumber(row.focus);
  const fatigue = reportNumber(row.fatigue);
  const motivation = reportNumber(row.motivation);

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-white transition hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold text-slate-400">گزارش روزانه</p>
          <strong className="mt-1 block text-sm text-ink">
            {date ? formatDate(String(date)) : "بدون تاریخ"}
          </strong>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="blue">تمرکز {fa(focus)}/۱۰</Badge>
          <Badge tone="green">انگیزه {fa(motivation)}/۱۰</Badge>
          <Badge tone="amber">خستگی {fa(fatigue)}/۱۰</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/30 p-2.5">
          <BookOpen size={16} className="text-slate-400" />
          <span className="text-xs text-slate-500">مطالعه</span>
          <strong className="mr-auto text-sm">{fa(study)} ساعت</strong>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/30 p-2.5">
          <ListChecks size={16} className="text-slate-400" />
          <span className="text-xs text-slate-500">تست</span>
          <strong className="mr-auto text-sm">{fa(tests)}</strong>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 p-2.5">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-xs text-emerald-700">صحیح</span>
          <strong className="mr-auto text-sm text-emerald-800">
            {fa(correct)}
          </strong>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-rose-50/70 p-2.5">
          <XCircle size={16} className="text-rose-500" />
          <span className="text-xs text-rose-700">غلط</span>
          <strong className="mr-auto text-sm text-rose-800">{fa(wrong)}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
        <div className="grid gap-2.5 rounded-xl border border-slate-100 p-3">
          <Meter label="تمرکز" value={focus} tone="focus" />
          <Meter label="انگیزه" value={motivation} tone="motivation" />
          <Meter label="خستگی" value={fatigue} tone="fatigue" />
        </div>
        <div className="grid content-start gap-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <CircleGauge size={16} />
              دقت پاسخ‌ها
            </span>
            <strong className="text-lg">
              {accuracy === null ? "-" : `${fa(accuracy)}٪`}
            </strong>
          </div>
          {row.problem ? (
            <p className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">
              <AlertTriangle className="mt-1 shrink-0" size={16} />
              <span>
                <strong>مسئله:</strong> {String(row.problem)}
              </span>
            </p>
          ) : null}
          {row.tomorrow ? (
            <p className="flex gap-2 rounded-xl bg-indigo-50 p-3 text-sm leading-6 text-indigo-800">
              <Target className="mt-1 shrink-0" size={16} />
              <span>
                <strong>فردا:</strong> {String(row.tomorrow)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
