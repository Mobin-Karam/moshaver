import {
  Activity,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../../shared/ui/ui";

const icons = [BookOpenCheck, Activity, CalendarDays, BarChart3];

type InsightValue = {
  label: string;
  value: number;
  loading?: boolean;
  error?: boolean;
  hint?: string;
};

export function StudentInsights({
  values,
  onRetry,
}: {
  values: InsightValue[];
  onRetry?: () => void;
}) {
  const hasError = values.some((item) => item.error);
  return (
    <section className="grid gap-3" aria-labelledby="student-activity-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="student-activity-heading"
            className="text-sm font-black text-ink"
          >
            فعالیت و داده‌های آموزشی
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            این داده‌ها فقط هنگام باز شدن این بخش دریافت می‌شوند.
          </p>
        </div>
        {hasError && onRetry ? (
          <Button
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            onClick={onRetry}
          >
            <RefreshCw size={14} />
            تلاش دوباره
          </Button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
        {values.map((item, index) => {
          const Icon = icons[index % icons.length];
          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {item.label}
                </span>
                <span className="grid size-8 place-items-center rounded-lg bg-white text-brand ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                  <Icon size={15} />
                </span>
              </div>
              {item.loading ? (
                <div
                  className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                  aria-label="در حال دریافت"
                />
              ) : item.error ? (
                <strong className="mt-2 block text-base text-rose-700 dark:text-rose-300">
                  دریافت ناموفق
                </strong>
              ) : (
                <strong className="mt-2 block text-2xl tracking-tight text-ink">
                  {item.value.toLocaleString("fa-IR")}
                </strong>
              )}
              {item.hint ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {item.hint}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
