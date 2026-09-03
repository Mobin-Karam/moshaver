import { BarChart3, BookOpen, Brain, CircleGauge, ClipboardList, Flame, Target } from "lucide-react";
import { Card } from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";

export function ReportSummary({ summary }: { summary: { count: number; studyHours: number; tests: number; accuracy: number; focus: number; motivation: number; fatigue: number } }) {
  const items = [
    ["تعداد گزارش", fa(summary.count), ClipboardList],
    ["ساعت مطالعه", fa(Math.round(summary.studyHours * 10) / 10), BookOpen],
    ["تعداد تست", fa(summary.tests), BarChart3],
    ["دقت", `${fa(summary.accuracy)}٪`, CircleGauge],
    ["میانگین تمرکز", `${fa(Math.round(summary.focus * 10) / 10)}/۱۰`, Brain],
    ["میانگین انگیزه", `${fa(Math.round(summary.motivation * 10) / 10)}/۱۰`, Target],
    ["میانگین خستگی", `${fa(Math.round(summary.fatigue * 10) / 10)}/۱۰`, Flame],
  ] as const;
  return <Card>
    <div className="mb-3"><h3 className="font-bold">خلاصه بازه انتخابی</h3><p className="mt-1 text-xs text-slate-500">محاسبه‌شده از گزارش‌هایی که همین حالا دریافت شده‌اند.</p></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
      {items.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-900/30/70 p-3">
        <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-500">{label}</span><Icon size={15} className="text-slate-400" /></div>
        <strong className="mt-2 block text-lg text-ink">{value}</strong>
      </div>)}
    </div>
  </Card>;
}
