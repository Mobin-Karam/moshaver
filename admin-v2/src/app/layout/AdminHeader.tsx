import { ChevronLeft, Home, Menu, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { HeaderClock } from "../../features/clock";
import { HeaderNotifications } from "../../features/notifications";
import { ThemeSwitcher } from "../../shared/theme/theme";
import { adminDestination, resolveAdminNavigation } from "./admin-navigation";
import { AdminAccountMenu } from "./AdminAccountMenu";
import type { AdminBreadcrumb, AdminCurrentNavigation } from "./layout-types";

export function AdminHeader({
  current,
  breadcrumbs,
  selectedStudentId,
  sticky = true,
  onOpenMobileNavigation,
  onOpenSearch,
}: {
  current: AdminCurrentNavigation;
  breadcrumbs: AdminBreadcrumb[];
  selectedStudentId: string;
  sticky?: boolean;
  onOpenMobileNavigation: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <header
      className={`${sticky ? "sticky top-0" : "relative"} z-30 border-b border-slate-200/80 bg-white/85 text-slate-900 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 dark:border-slate-800 dark:bg-slate-950/85 dark:text-slate-100 dark:supports-[backdrop-filter]:bg-slate-950/75`}
    >
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={onOpenMobileNavigation}
            aria-label="بازکردن منوی مدیریت"
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <nav
              aria-label="موقعیت صفحه"
              className="mb-0.5 hidden min-w-0 items-center gap-1 text-[10px] text-slate-400 md:flex"
            >
              {breadcrumbs.map((item, index) => {
                const destination = resolveAdminNavigation(item.path);
                return (
                  <span
                    key={`${item.path}-${index}`}
                    className="flex min-w-0 items-center gap-1"
                  >
                    {index ? (
                      <ChevronLeft className="shrink-0" size={11} />
                    ) : (
                      <Home className="shrink-0" size={11} />
                    )}
                    {index === breadcrumbs.length - 1 ? (
                      <span
                        className="truncate font-semibold text-slate-600 dark:text-slate-300"
                        aria-current="page"
                      >
                        {item.title}
                      </span>
                    ) : (
                      <NavLink
                        className="truncate rounded-sm outline-none transition hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
                        to={adminDestination(
                          item.path,
                          destination.section,
                          selectedStudentId,
                        )}
                      >
                        {item.title}
                      </NavLink>
                    )}
                  </span>
                );
              })}
            </nav>
            <strong className="block truncate text-sm sm:text-base">
              {current.title}
            </strong>
            <p className="hidden truncate text-[11px] text-slate-500 dark:text-slate-400 xl:block">
              {current.description}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <HeaderClock />
          <button
            type="button"
            className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-slate-500 outline-none transition hover:bg-slate-50 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:flex xl:px-3"
            onClick={onOpenSearch}
            aria-label="جستجو و رفتن سریع"
            title="جستجو و رفتن سریع (Ctrl/⌘ + Shift + P)"
          >
            <Search size={17} />
            <span className="hidden text-xs font-semibold xl:inline">
              جستجو
            </span>
            <kbd
              className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800 2xl:inline"
              dir="ltr"
            >
              Ctrl ⇧ P
            </kbd>
          </button>
          <div className="hidden xl:block">
            <ThemeSwitcher />
          </div>
          <HeaderNotifications />
          <AdminAccountMenu />
        </div>
      </div>
    </header>
  );
}
