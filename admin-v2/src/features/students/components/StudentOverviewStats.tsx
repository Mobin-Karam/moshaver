import { Archive, CheckCircle2, CircleOff, FileWarning, UsersRound } from "lucide-react";
import type { StudentStatusFilter } from "./student-ui";

const items = [
  { key: "all", label: "همه", icon: UsersRound },
  { key: "active", label: "فعال", icon: CheckCircle2 },
  { key: "inactive", label: "غیرفعال", icon: CircleOff },
  { key: "archived", label: "بایگانی", icon: Archive },
] as const;

export function StudentOverviewStats({
  counts,
  status,
  onStatusChange,
  incomplete,
  incompleteOnly,
  onIncompleteToggle,
}: {
  counts: Record<StudentStatusFilter, number>;
  status: StudentStatusFilter;
  onStatusChange: (status: StudentStatusFilter) => void;
  incomplete: number;
  incompleteOnly: boolean;
  onIncompleteToggle: () => void;
}) {
  return <section className="-mx-1 overflow-x-auto px-1 pb-1" aria-label="فیلتر سریع دانش‌آموزان">
    <div className="flex min-w-max items-center gap-2">
      {items.map(({ key, label, icon: Icon }) => {
        const active = status === key && !incompleteOnly;
        return <button
          key={key}
          type="button"
          aria-pressed={active}
          onClick={() => onStatusChange(key)}
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? "border-brand bg-brand text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
        >
          <Icon size={15} />
          <span>{label}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{counts[key].toLocaleString("fa-IR")}</span>
        </button>;
      })}
      <button
        type="button"
        aria-pressed={incompleteOnly}
        onClick={onIncompleteToggle}
        className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${incompleteOnly ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
      >
        <FileWarning size={15} />
        <span>پرونده ناقص</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${incompleteOnly ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{incomplete.toLocaleString("fa-IR")}</span>
      </button>
    </div>
  </section>;
}
