import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { adminDestination, mainAdminNavigation } from "./admin-navigation";

export function AdminMainSidebar({
  collapsed,
  currentSection,
  currentPath,
  selectedStudentId,
  onToggle,
  onOpenSearch,
}: {
  collapsed: boolean;
  currentSection: string;
  currentPath: string;
  selectedStudentId: string;
  onToggle: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 hidden flex-col border-l border-slate-200 bg-white shadow-sm transition-[width,padding] duration-200 motion-reduce:transition-none lg:flex ${collapsed ? "w-[4.5rem] p-2" : "w-64 p-3"}`}
      aria-label="ناوبری اصلی مدیریت"
    >
      <div className={`shrink-0 ${collapsed ? "mb-2 grid justify-items-center gap-1" : "mb-3 flex h-12 items-center justify-between gap-2 px-1"}`}>
        {!collapsed ? (
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight">Moshaver | مشاور</h1>
            <p className="truncate text-[11px] font-semibold text-slate-400">پنل مدیریت</p>
          </div>
        ) : (
          <div className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-black text-white" aria-hidden="true">
            M
          </div>
        )}
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
          title={collapsed ? "بازکردن نوار اصلی" : "بستن نوار اصلی"}
          aria-label={collapsed ? "بازکردن نوار اصلی" : "بستن نوار اصلی"}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <button
        type="button"
        className={`mb-3 flex h-10 w-full shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none transition hover:border-slate-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-brand ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}
        onClick={onOpenSearch}
        title={collapsed ? "جستجو و رفتن سریع" : undefined}
        aria-label="جستجو و رفتن سریع"
      >
        <Search size={17} className="shrink-0" />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-right text-xs font-semibold">جستجو و رفتن سریع</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-400" dir="ltr">
              Ctrl ⇧ P
            </kbd>
          </>
        ) : null}
      </button>

      <nav className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain pb-2">
        {mainAdminNavigation.map(({ path, title, section, icon: Icon }) => {
          const active = currentSection === section;
          return (
            <NavLink
              key={path}
              to={adminDestination(active ? currentPath : path, section, selectedStudentId)}
              end={path === ""}
              title={collapsed ? title : undefined}
              aria-label={title}
              aria-current={active ? "location" : undefined}
              className={`relative flex h-11 items-center rounded-lg text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-indigo-50 text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}
            >
              {active ? <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-brand" aria-hidden="true" /> : null}
              <Icon className="shrink-0" size={19} strokeWidth={active ? 2.4 : 1.9} />
              {!collapsed ? <span className="truncate">{title}</span> : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
