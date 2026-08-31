import {
  Activity,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Database,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  UsersRound,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "../../shared/ui/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { useModal } from "../../shared/ui/modal";
import { DevBackendSwitcher } from "../dev/DevBackendSwitcher";

const nav = [
  ["", "داشبورد", LayoutDashboard],
  ["live", "فعالیت زنده", Activity],
  ["students", "دانش‌آموزان", UsersRound],
  ["planner", "برنامه‌ریز", CalendarDays],
  ["exams", "آزمون‌ها", BookOpenCheck],
  ["questions", "بانک سؤال", GraduationCap],
  ["quizzes", "آزمونک‌ها", BookOpenCheck],
  ["chat", "گفتگو", MessageSquare],
  ["notifications", "اعلان‌ها", Bell],
  ["reports", "گزارش‌ها", LayoutDashboard],
  ["subjects", "درس‌ها", BookOpen],
  ["system", "سیستم", Database],
  ["settings", "تنظیمات", Settings],
] as const;

export function AdminLayout() {
  const auth = useAuth();
  const modal = useModal();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6">
          <h1 className="text-xl font-black">Moshaver | مشاور</h1>
          <p className="text-sm text-slate-500">پنل مدیریت نسخه React</p>
        </div>
        <nav className="grid gap-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={`/admin/${to}`}
              end={to === ""}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:mr-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur sm:px-4">
          <div className="min-w-0">
            <strong className="block truncate text-sm sm:text-base">
              {auth.user?.displayName || auth.user?.display_name || "مشاور"}
            </strong>
            <p className="hidden text-xs text-slate-500 sm:block">نقش: مدیر</p>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <DevBackendSwitcher />
            <Button
              className="h-9 shrink-0 px-2 sm:px-3"
              variant="soft"
              title="خروج از پنل"
              aria-label="خروج از پنل"
              onClick={() =>
                void modal
                  .confirm({
                    title: "خروج از پنل؟",
                    description: "نشست این دستگاه بسته می‌شود.",
                    confirmLabel: "خروج",
                    tone: "danger",
                  })
                  .then((confirmed) => {
                    if (confirmed) void auth.logout();
                  })
              }
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </header>
        <nav className="sticky top-16 z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={`/admin/${to}`}
              end={to === ""}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${isActive ? "bg-teal-50 text-brand" : "text-slate-600"}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="w-full p-3 sm:p-4 lg:p-5 xl:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
