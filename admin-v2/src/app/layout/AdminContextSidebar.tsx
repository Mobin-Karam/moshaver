import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { adminDestination } from "./admin-navigation";
import type { AdminCurrentNavigation } from "./layout-types";

export function AdminContextSidebar({
  collapsed,
  mainCollapsed,
  current,
  items,
  unreadNotifications,
  selectedStudentId,
  onToggle,
}: {
  collapsed: boolean;
  mainCollapsed: boolean;
  current: AdminCurrentNavigation;
  items: ReadonlyArray<{
    path: string;
    title: string;
    icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  }>;
  unreadNotifications: number;
  selectedStudentId: string;
  onToggle: () => void;
}) {
  const widthClasses = collapsed ? "w-16 p-2" : "w-16 p-2 xl:w-52 xl:p-3";

  return (
    <aside
      className={`fixed inset-y-0 z-40 hidden flex-col border-l border-slate-200 bg-slate-50/95 transition-[right,width,padding] duration-200 motion-reduce:transition-none lg:flex ${mainCollapsed ? "right-[4.5rem]" : "right-64"} ${widthClasses}`}
      aria-label={`مسیرهای بخش ${current.section}`}
    >
      <div className={`mb-3 flex h-11 shrink-0 items-center ${collapsed ? "justify-center" : "justify-center xl:justify-between xl:gap-2 xl:px-1"}`}>
        {!collapsed ? (
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-[10px] font-bold text-slate-400">بخش فعال</p>
            <p className="truncate text-xs font-black text-slate-600">{current.section}</p>
          </div>
        ) : null}
        <button
          type="button"
          className="hidden size-9 shrink-0 place-items-center rounded-lg text-slate-500 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-brand xl:grid"
          title={collapsed ? "بازکردن مسیرهای بخش" : "بستن مسیرهای بخش"}
          aria-label={collapsed ? "بازکردن مسیرهای بخش" : "بستن مسیرهای بخش"}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain pb-2">
        {items.map(({ path, title, icon: Icon }) => {
          const active = current.path === path;
          const unread = path === "notifications" ? unreadNotifications : 0;
          const compactClasses = collapsed ? "justify-center px-2" : "justify-center px-2 xl:justify-start xl:gap-2 xl:px-3";
          const badgeClasses = collapsed
            ? "absolute -left-0.5 -top-0.5"
            : "absolute -left-0.5 -top-0.5 xl:static xl:mr-auto";

          return (
            <NavLink
              key={path}
              to={adminDestination(path, current.section, selectedStudentId)}
              title={title}
              aria-label={title}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-10 items-center rounded-lg text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand ${compactClasses} ${active ? "bg-white font-bold text-brand shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white hover:text-ink"}`}
            >
              {active ? <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-brand" aria-hidden="true" /> : null}
              <Icon className="shrink-0" size={17} strokeWidth={active ? 2.4 : 1.9} />
              {!collapsed ? <span className="hidden truncate xl:block">{title}</span> : null}
              {unread ? (
                <span
                  className={`${badgeClasses} min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-5 text-white`}
                  aria-label={`${unread.toLocaleString("fa-IR")} اعلان خوانده‌نشده`}
                >
                  {Math.min(unread, 99).toLocaleString("fa-IR")}
                  {unread > 99 ? "+" : ""}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
