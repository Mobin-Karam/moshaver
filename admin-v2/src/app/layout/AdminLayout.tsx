import { ChevronLeft, Home, LogOut } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "../../shared/ui/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { useModal } from "../../shared/ui/modal";
import { DevBackendSwitcher } from "../dev/DevBackendSwitcher";
import { adminNavigation, flatAdminNavigation } from "./admin-navigation";

export function AdminLayout() {
  const auth = useAuth();
  const modal = useModal();
  const location = useLocation();
  const routePath = location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const current = flatAdminNavigation.find((item) => item.path === routePath) || flatAdminNavigation[0];
  const contextual = adminNavigation.find((group) => group.section === current.section)?.items || [];
  const showContextRail = ["questions", "quizzes", "reports", "system", "settings"].includes(current.path) && contextual.length > 1;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6">
          <h1 className="text-xl font-black">Moshaver | مشاور</h1>
          <p className="text-sm text-slate-500">پنل مدیریت نسخه React</p>
        </div>
        <nav className="grid max-h-[calc(100vh-8rem)] gap-4 overflow-y-auto pl-1">
          {adminNavigation.map((group) => <div key={group.section}><p className="mb-1 px-3 text-[10px] font-bold text-slate-400">{group.section}</p><div className="grid gap-1">{group.items.map(({ path, title, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              end={path === ""}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              <Icon size={18} />
              {title}
            </NavLink>
          ))}</div></div>)}
        </nav>
      </aside>
      {showContextRail ? <aside className="fixed inset-y-0 right-64 z-10 hidden w-52 border-l border-slate-200 bg-slate-50/95 p-3 xl:block"><p className="mb-3 px-2 pt-2 text-xs font-black text-slate-500">{current.section}</p><nav className="grid gap-1">{contextual.map(({ path, title, icon: Icon }) => <NavLink key={path} to={`/admin/${path}`} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? "bg-white font-bold text-brand shadow-sm" : "text-slate-600 hover:bg-white"}`}><Icon size={16} />{title}</NavLink>)}</nav></aside> : null}
      <div className={`lg:mr-64 ${showContextRail ? "xl:mr-[29rem]" : ""}`}>
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Home size={12} /><NavLink to="/admin">خانه</NavLink>{current.path ? <><ChevronLeft size={12} /><span className="truncate">{current.title}</span></> : null}</div>
            <strong className="block truncate text-sm sm:text-base">{current.title}</strong>
            <p className="hidden truncate text-xs text-slate-500 md:block">{current.description}</p>
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
          {flatAdminNavigation.map(({ path, title, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              end={path === ""}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${isActive ? "bg-teal-50 text-brand" : "text-slate-600"}`
              }
            >
              <Icon size={16} />
              {title}
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
