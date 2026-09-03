import {
  CalendarCheck2,
  ClipboardCheck,
  GraduationCap,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Card } from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import type { AdminDashboardSummary } from "../model/dashboard.types";

type Metric = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
};

export function DashboardMetricCards({
  summary,
}: {
  summary: AdminDashboardSummary;
}) {
  const metrics: Metric[] = [
    {
      label: "دانش‌آموز فعال",
      value: summary.students,
      hint: "حساب‌های فعال سامانه",
      icon: UsersRound,
    },
    {
      label: "برنامه منتشرشده امروز",
      value: summary.todayPlans,
      hint: "برنامه‌های آماده اجرای امروز",
      icon: CalendarCheck2,
    },
    {
      label: "گزارش امروز",
      value: summary.todayReports,
      hint: "گزارش‌های روزانه ثبت‌شده",
      icon: ClipboardCheck,
    },
    {
      label: "آزمون پیش‌رو",
      value: summary.upcomingExams,
      hint: "آزمون‌های امروز و آینده",
      icon: GraduationCap,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            className="group relative overflow-hidden border-slate-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {metric.label}
                </span>
                <strong className="mt-2 block text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                  {fa(metric.value)}
                </strong>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-brand/10 group-hover:text-brand dark:bg-slate-800 dark:text-slate-300">
                <Icon size={19} />
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-400 dark:text-slate-500">
              {metric.hint}
            </p>
          </Card>
        );
      })}
    </section>
  );
}
