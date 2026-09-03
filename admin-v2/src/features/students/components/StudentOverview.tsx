import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Target,
  UserRound,
} from "lucide-react";
import type { Student } from "../../../shared/types/domain";
import { Button } from "../../../shared/ui/ui";
import { countData } from "../model/student-form";
import {
  formatStudentLastSeen,
  getMissingStudentProfileFields,
  getStudentProfileCompleteness,
  getStudentUsername,
} from "./student-ui";

export function StudentOverview({
  student,
  overview,
  loading,
  error,
  onRetry,
  onEdit,
}: {
  student: Student;
  overview?: Record<string, unknown>;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onEdit: () => void;
}) {
  const completeness = getStudentProfileCompleteness(student);
  const missing = getMissingStudentProfileFields(student);
  const facts = [
    [
      "پایه / رشته",
      [student.grade, student.major].filter(Boolean).join(" / ") || "ثبت نشده",
      GraduationCap,
    ],
    [
      "هدف",
      [
        student.targetField || student.target_major,
        student.targetUniversity || student.target_city,
      ]
        .filter(Boolean)
        .join(" · ") || "ثبت نشده",
      Target,
    ],
    [
      "ظرفیت روزانه",
      student.dailyCapacity || student.daily_capacity || "ثبت نشده",
      CalendarClock,
    ],
    ["نام کاربری", getStudentUsername(student) || "ثبت نشده", UserRound],
  ] as const;
  const recentReports = countData(overview?.recentReports);

  return (
    <section className="grid gap-4" aria-labelledby="student-overview-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="student-overview-heading"
            className="text-sm font-black text-ink"
          >
            نمای کلی دانش‌آموز
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            اطلاعات سریع برای تصمیم‌گیری؛ ویرایش فقط در تب پروفایل انجام می‌شود.
          </p>
        </div>
        <Button variant="soft" className="h-9" onClick={onEdit}>
          ویرایش پروفایل
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {facts.map(([label, value, Icon]) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <strong className="mt-1 block truncate text-sm text-slate-700 dark:text-slate-200">
                {value}
              </strong>
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <span>
            <strong className="block text-sm text-ink">وضعیت پرونده</strong>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {missing.length
                ? `${missing.length.toLocaleString("fa-IR")} مورد هنوز تکمیل نشده`
                : "پرونده کامل است"}
            </span>
          </span>
          <strong className="text-xl text-brand">
            ٪{completeness.toLocaleString("fa-IR")}
          </strong>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-label="تکمیل پرونده"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completeness}
        >
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${completeness}%` }}
          />
        </div>
        {missing.length ? (
          <div className="flex flex-wrap gap-1.5">
            {missing.map((field) => (
              <span
                key={field}
                className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              >
                {field}
              </span>
            ))}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={14} />
            تمام اطلاعات اصلی ثبت شده است.
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            آخرین فعالیت
          </span>
          <strong className="mt-1 block text-sm text-ink">
            {formatStudentLastSeen(student.last_seen_at)}
          </strong>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            گزارش‌های اخیر
          </span>
          {loading ? (
            <div className="mt-2 h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : error ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertTriangle size={13} />
                دریافت ناموفق
              </span>
              {onRetry ? (
                <button
                  type="button"
                  className="text-xs font-bold text-brand"
                  onClick={onRetry}
                >
                  تلاش دوباره
                </button>
              ) : null}
            </div>
          ) : (
            <strong className="mt-1 block text-lg text-ink">
              {recentReports.toLocaleString("fa-IR")}
            </strong>
          )}
        </div>
      </div>
    </section>
  );
}
