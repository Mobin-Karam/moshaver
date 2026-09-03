import { BarChart3, BookOpenCheck, CalendarDays, ChevronLeft, FileQuestion, LayoutDashboard, MessageCircle, NotebookTabs } from "lucide-react";
import { Link } from "react-router-dom";

const destinations = [
  ["/admin/learning", "یادگیری", "آیتم‌ها و وضعیت یادگیری", BookOpenCheck],
  ["/admin/planner", "برنامه", "برنامه روزانه و هفتگی", CalendarDays],
  ["/admin/exams", "آزمون", "آزمون‌ها و نتایج", NotebookTabs],
  ["/admin/questions", "سؤال‌ها", "بانک سؤال دانش‌آموز", FileQuestion],
  ["/admin/chat", "گفتگو", "پیام و ارتباط مستقیم", MessageCircle],
  ["/admin/reports", "گزارش", "عملکرد و مطالعه", BarChart3],
  ["/admin/dashboard", "داشبورد", "نمای کلی فعالیت", LayoutDashboard],
] as const;

export function StudentAdminAccess({ selectedId }: { selectedId: string }) {
  if (!selectedId) return null;
  const query = `studentId=${encodeURIComponent(selectedId)}`;
  return <section className="grid gap-3" aria-labelledby="student-access-heading">
    <div>
      <h3 id="student-access-heading" className="text-sm font-black text-ink">فضای کاری دانش‌آموز</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">شناسه دانش‌آموز در مقصد حفظ می‌شود.</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {destinations.map(([path, label, description, Icon]) => <Link key={path} className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-right transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800" to={`${path}?${query}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-brand transition group-hover:bg-brand group-hover:text-white dark:bg-slate-800"><Icon size={17} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-700 dark:text-slate-200">{label}</strong><span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{description}</span></span>
        <ChevronLeft className="shrink-0 text-slate-400" size={14} />
      </Link>)}
    </div>
  </section>;
}
