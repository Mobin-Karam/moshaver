import { Bell, BookOpenCheck, CalendarDays, GraduationCap, LayoutDashboard, LogOut, MessageSquare, Settings, UsersRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "./ui";
import { useAuth } from "../features/auth/AuthProvider";

const nav = [
  ["", "داشبورد", LayoutDashboard],
  ["students", "دانش‌آموزان", UsersRound],
  ["planner", "برنامه‌ریز", CalendarDays],
  ["exams", "آزمون‌ها", BookOpenCheck],
  ["questions", "بانک سؤال", GraduationCap],
  ["chat", "گفتگو", MessageSquare],
  ["notifications", "اعلان‌ها", Bell],
  ["reports", "گزارش‌ها", LayoutDashboard],
  ["settings", "تنظیمات", Settings],
] as const;

export function AdminLayout() {
  const auth = useAuth();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6"><h1 className="text-xl font-black">Moshaver | مشاور</h1><p className="text-sm text-slate-500">پنل مدیریت نسخه React</p></div>
        <nav className="grid gap-1">{nav.map(([to, label, Icon]) => <NavLink key={to} to={`/admin/${to}`} end={to === ""} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={18} />{label}</NavLink>)}</nav>
      </aside>
      <div className="lg:mr-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <div><strong>{auth.user?.displayName || auth.user?.display_name || "مشاور"}</strong><p className="text-xs text-slate-500">نقش: مدیر</p></div>
          <Button variant="soft" onClick={() => void auth.logout()}><LogOut size={16} />خروج</Button>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
