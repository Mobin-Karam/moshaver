import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  LayoutGrid,
  Pencil,
  ShieldCheck,
  UserRound,
  Workflow,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Student } from "../../../shared/types/domain";
import { Card } from "../../../shared/ui/ui";
import {
  formatStudentLastSeen,
  getStudentStatus,
  getStudentUsername,
  studentStatusCopy,
  type StudentDetailTab,
} from "./student-ui";

const tabs = [
  ["overview", "نمای کلی", LayoutGrid],
  ["activity", "فعالیت", Activity],
  ["profile", "پروفایل", Pencil],
  ["access", "فضای کاری", Workflow],
  ["security", "امنیت", ShieldCheck],
] as const;

export function StudentDetail({
  student,
  tab,
  onTabChange,
  onBack,
  children,
  dirty = false,
}: {
  student: Student;
  tab: StudentDetailTab;
  onTabChange: (tab: StudentDetailTab) => void;
  onBack: () => void;
  children: ReactNode;
  dirty?: boolean;
}) {
  const [copied, setCopied] = useState<"id" | "username" | "">("");
  const status = studentStatusCopy[getStudentStatus(student)];

  async function copy(value: string, type: "id" | "username") {
    if (!value || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(""), 1400);
    } catch {
      setCopied("");
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden p-0 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]">
      <div className="border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand xl:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowRight size={15} />
          بازگشت به فهرست
        </button>
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <UserRound size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-black text-ink">{student.name}</h2>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}
              >
                {status.label}
              </span>
              {dirty ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  تغییر ذخیره‌نشده
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              آخرین فعالیت: {formatStudentLastSeen(student.last_seen_at)}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void copy(student.id, "id")}
            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-right text-[11px] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          >
            <span className="min-w-0">
              <span className="block text-slate-500 dark:text-slate-400">
                شناسه
              </span>
              <strong
                className="block truncate text-slate-700 dark:text-slate-200"
                dir="ltr"
              >
                {student.id}
              </strong>
            </span>
            {copied === "id" ? (
              <Check size={14} className="text-brand" />
            ) : (
              <Copy size={14} className="text-slate-400" />
            )}
          </button>
          <button
            type="button"
            disabled={!getStudentUsername(student)}
            onClick={() => void copy(getStudentUsername(student), "username")}
            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-right text-[11px] hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          >
            <span className="min-w-0">
              <span className="block text-slate-500 dark:text-slate-400">
                نام کاربری
              </span>
              <strong
                className="block truncate text-slate-700 dark:text-slate-200"
                dir="ltr"
              >
                {getStudentUsername(student) || "ثبت نشده"}
              </strong>
            </span>
            {copied === "username" ? (
              <Check size={14} className="text-brand" />
            ) : (
              <Copy size={14} className="text-slate-400" />
            )}
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          {copied === "id"
            ? "شناسه کپی شد"
            : copied === "username"
              ? "نام کاربری کپی شد"
              : ""}
        </span>
      </div>

      <nav
        className="overflow-x-auto border-b border-slate-200 px-2 dark:border-slate-800"
        aria-label="بخش‌های پرونده دانش‌آموز"
      >
        <div className="flex min-w-max items-center gap-1">
          {tabs.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-current={tab === value ? "page" : undefined}
              onClick={() => onTabChange(value)}
              className={`relative inline-flex h-11 items-center gap-1.5 px-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === value ? "text-brand after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand" : "text-slate-500 hover:text-ink dark:text-slate-400"}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-h-[calc(100vh-21rem)] overflow-y-auto p-3 sm:p-4 xl:max-h-[calc(100vh-20rem)]">
        {children}
      </div>
    </Card>
  );
}
