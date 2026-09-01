import { ChevronLeft, ChevronRight, Home, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "../../shared/ui/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { useModal } from "../../shared/ui/modal";
import { DevBackendSwitcher } from "../dev/DevBackendSwitcher";
import { adminBreadcrumbs, adminDestination, adminNavigation, flatAdminNavigation, mainAdminNavigation, resolveAdminNavigation } from "./admin-navigation";
import { HeaderNotifications } from "../../features/notifications/HeaderNotifications";
import { useAdminNotifications } from "../../features/notifications/NotificationProvider";

export function AdminLayout() {
  const auth = useAuth();
  const modal = useModal();
  const notificationState = useAdminNotifications();
  const location = useLocation();
  const [mainCollapsed, setMainCollapsed] = usePersistentCollapse("admin-main-sidebar-collapsed");
  const [contextCollapsed, setContextCollapsed] = usePersistentCollapse("admin-context-sidebar-collapsed");
  const current = resolveAdminNavigation(location.pathname);
  const breadcrumbs = adminBreadcrumbs(location.pathname);
  const contextual = adminNavigation.find((group) => group.section === current.section)?.items || [];
  const showContextRail = contextual.length > 0;
  const selectedStudentId = new URLSearchParams(location.search).get("studentId") || (typeof window !== "undefined" ? window.localStorage.getItem("admin-selected-student-id") : "") || "";
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
          {mainAdminNavigation.map(({ path, title, section, icon: Icon }) => (
            <NavLink
              key={path}
              to={adminDestination(path, section, selectedStudentId)}
              end={path === ""}
              title={mainCollapsed ? title : undefined}
              aria-label={title}
              aria-current={current.section === section ? "page" : undefined}
              className={() =>
                `flex h-11 items-center rounded-md text-sm font-semibold ${mainCollapsed ? "justify-center px-2" : "gap-3 px-3"} ${current.section === section ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              <Icon className="shrink-0" size={19} />
              {!mainCollapsed ? <span className="truncate">{title}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>
      {showContextRail ? <aside className={`fixed inset-y-0 z-20 hidden border-l border-slate-200 bg-slate-50/95 transition-[right,width] lg:block ${mainCollapsed ? "right-[4.5rem]" : "right-64"} ${contextCollapsed ? "w-16 p-2" : "w-52 p-3"}`}><div className={`mb-3 flex items-center ${contextCollapsed ? "justify-center" : "justify-between gap-2 px-1"}`}>{!contextCollapsed ? <p className="truncate text-xs font-black text-slate-500">مسیرهای {current.section}</p> : null}<button type="button" className="grid size-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white" title={contextCollapsed ? "بازکردن مسیرهای بخش" : "بستن مسیرهای بخش"} aria-label={contextCollapsed ? "بازکردن مسیرهای بخش" : "بستن مسیرهای بخش"} aria-expanded={!contextCollapsed} onClick={() => setContextCollapsed((value) => !value)}>{contextCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div><nav className="grid gap-1 overflow-hidden" aria-label={`مسیرهای ${current.section}`}>{contextual.map(({ path, title, icon: Icon }) => <NavLink key={path} to={adminDestination(path, current.section, selectedStudentId)} title={contextCollapsed ? title : undefined} aria-label={title} aria-current={current.path === path ? "page" : undefined} className={() => `relative flex h-10 items-center rounded-md text-sm ${contextCollapsed ? "justify-center px-2" : "gap-2 px-3"} ${current.path === path ? "bg-white font-bold text-brand shadow-sm" : "text-slate-600 hover:bg-white"}`}><Icon className="shrink-0" size={17} />{!contextCollapsed ? <span className="truncate">{title}</span> : null}{path === "notifications" && notificationState.unread ? <span className={`${contextCollapsed ? "absolute -left-0.5 -top-0.5" : "mr-auto"} min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-5 text-white`}>{Math.min(notificationState.unread, 99).toLocaleString("fa-IR")}{notificationState.unread > 99 ? "+" : ""}</span> : null}</NavLink>)}</nav></aside> : null}
      <div className={`${mainCollapsed ? contextCollapsed ? "lg:mr-[8.5rem]" : "lg:mr-[17.5rem]" : contextCollapsed ? "lg:mr-80" : "lg:mr-[29rem]"} transition-[margin]`}>
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur sm:px-4">
          <div className="min-w-0 flex-1">
            <nav aria-label="موقعیت صفحه" className="mb-0.5 flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
              {breadcrumbs.map((item, index) => <span key={`${item.path}-${index}`} className="flex min-w-0 items-center gap-1">{index ? <ChevronLeft className="shrink-0" size={12} /> : <Home className="shrink-0" size={12} />}{index === breadcrumbs.length - 1 ? <span className="truncate font-semibold text-slate-600" aria-current="page">{item.title}</span> : <NavLink className="truncate transition hover:text-brand" to={item.path ? `/admin/${item.path}` : "/admin"}>{item.title}</NavLink>}</span>)}
            </nav>
            <strong className="block truncate text-sm sm:text-base">{current.title}</strong>
            <p className="hidden truncate text-xs text-slate-500 md:block">{current.description}</p>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <HeaderNotifications />
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
          {flatAdminNavigation.map(({ path, title, icon: Icon, section }) => (
            <NavLink
              key={path}
              to={adminDestination(path, section, selectedStudentId)}
              end={path === ""}
              aria-current={current.path === path ? "page" : undefined}
              className={() =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${current.path === path ? "bg-teal-50 text-brand" : "text-slate-600"}`
              }
            >
              <Icon size={16} />
              {title}
              {path === "notifications" && notificationState.unread ? <span className="rounded-full bg-rose-600 px-1.5 text-[10px] text-white">{Math.min(notificationState.unread, 99).toLocaleString("fa-IR")}</span> : null}
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
