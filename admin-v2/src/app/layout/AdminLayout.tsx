import { ChevronLeft, ChevronRight, Home, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "../../shared/ui/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { useModal } from "../../shared/ui/modal";
import { DevBackendSwitcher } from "../dev/DevBackendSwitcher";
import { adminNavigation, flatAdminNavigation, mainAdminNavigation } from "./admin-navigation";

export function AdminLayout() {
  const auth = useAuth();
  const modal = useModal();
  const location = useLocation();
  const [mainCollapsed, setMainCollapsed] = usePersistentCollapse("admin-main-sidebar-collapsed");
  const [contextCollapsed, setContextCollapsed] = usePersistentCollapse("admin-context-sidebar-collapsed");
  const routePath = location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const current = flatAdminNavigation.find((item) => item.path === routePath) || flatAdminNavigation[0];
  const contextual = adminNavigation.find((group) => group.section === current.section)?.items || [];
  const showContextRail = current.path !== "" && contextual.length > 1;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className={`fixed inset-y-0 right-0 z-30 hidden border-l border-slate-200 bg-white transition-[width] lg:block ${mainCollapsed ? "w-[4.5rem] p-2" : "w-64 p-4"}`}>
        <div className={`mb-4 flex items-start ${mainCollapsed ? "justify-center" : "justify-between gap-2"}`}>
          {!mainCollapsed ? <div><h1 className="text-xl font-black">Moshaver | مشاور</h1><p className="text-sm text-slate-500">پنل مدیریت</p></div> : null}
          <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100" title={mainCollapsed ? "بازکردن نوار اصلی" : "بستن نوار اصلی"} aria-label={mainCollapsed ? "بازکردن نوار اصلی" : "بستن نوار اصلی"} aria-expanded={!mainCollapsed} onClick={() => setMainCollapsed((value) => !value)}>
            {mainCollapsed ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}
          </button>
        </div>
        <nav className="grid max-h-[calc(100vh-5rem)] gap-1 overflow-y-auto overflow-x-hidden">
          {mainAdminNavigation.map(({ path, title, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              end={path === ""}
              title={mainCollapsed ? title : undefined}
              aria-label={title}
              className={({ isActive }) =>
                `flex h-11 items-center rounded-md text-sm font-semibold ${mainCollapsed ? "justify-center px-2" : "gap-3 px-3"} ${isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              <Icon className="shrink-0" size={19} />
              {!mainCollapsed ? <span className="truncate">{title}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>
      {showContextRail ? <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-slate-50/95 transition-[width] xl:block ${contextCollapsed ? "w-16 p-2" : "w-52 p-3"}`}><div className={`mb-3 flex items-center ${contextCollapsed ? "justify-center" : "justify-between gap-2 px-1"}`}>{!contextCollapsed ? <p className="truncate text-xs font-black text-slate-500">{current.section}</p> : null}<button type="button" className="grid size-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white" title={contextCollapsed ? "بازکردن نوار مرتبط" : "بستن نوار مرتبط"} aria-label={contextCollapsed ? "بازکردن نوار مرتبط" : "بستن نوار مرتبط"} aria-expanded={!contextCollapsed} onClick={() => setContextCollapsed((value) => !value)}>{contextCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div><nav className="grid gap-1 overflow-hidden">{contextual.map(({ path, title, icon: Icon }) => <NavLink key={path} to={`/admin/${path}`} title={contextCollapsed ? title : undefined} aria-label={title} className={({ isActive }) => `flex h-10 items-center rounded-md text-sm ${contextCollapsed ? "justify-center px-2" : "gap-2 px-3"} ${isActive ? "bg-white font-bold text-brand shadow-sm" : "text-slate-600 hover:bg-white"}`}><Icon className="shrink-0" size={17} />{!contextCollapsed ? <span className="truncate">{title}</span> : null}</NavLink>)}</nav></aside> : null}
      <div className={`${mainCollapsed ? "lg:mr-[4.5rem]" : "lg:mr-64"} ${showContextRail ? contextCollapsed ? "xl:ml-16" : "xl:ml-52" : ""} transition-[margin]`}>
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

function usePersistentCollapse(key: string) {
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(key) === "1");
  useEffect(() => { window.localStorage.setItem(key, collapsed ? "1" : "0"); }, [collapsed, key]);
  return [collapsed, setCollapsed] as const;
}
