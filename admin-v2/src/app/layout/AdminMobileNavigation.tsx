import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { adminDestination, navigationForCapabilities } from "./admin-navigation";
import type { AdminCurrentNavigation } from "./layout-types";
import { useAuth } from "../../features/auth";

function focusableElements(root: HTMLElement | null) {
  if (!root) return [] as HTMLElement[];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function AdminMobileDrawer({
  open,
  current,
  selectedStudentId,
  unreadNotifications,
  onClose,
  onOpenSearch,
}: {
  open: boolean;
  current: AdminCurrentNavigation;
  selectedStudentId: string;
  unreadNotifications: number;
  onClose: () => void;
  onOpenSearch: () => void;
}) {
  const auth = useAuth();
  const visibleNavigation = navigationForCapabilities(auth.capabilities);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusableElements(dialogRef.current);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousActive?.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] lg:hidden" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        aria-label="بستن منوی مدیریت"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        className="absolute inset-y-0 right-0 flex w-[min(90vw,22rem)] flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="منوی مدیریت"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <div className="min-w-0">
            <strong className="block truncate text-base">Moshaver | مشاور</strong>
            <p className="text-[11px] text-slate-500">پنل مدیریت</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="grid size-10 place-items-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onClose}
            aria-label="بستن منوی مدیریت"
          >
            <X size={19} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-3">
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-right text-xs font-semibold text-slate-500 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
          >
            <Search size={17} />
            <span className="flex-1">جستجو و رفتن سریع</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400 sm:inline" dir="ltr">
              Ctrl ⇧ P
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain p-3" aria-label="همه مسیرهای مدیریت">
          {visibleNavigation.map((group) => (
            <section key={group.section} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-2 text-[10px] font-black tracking-wide text-slate-400">{group.section}</p>
              <div className="grid gap-1">
                {group.items.map(({ path, title, icon: Icon }) => {
                  const active = current.path === path;
                  const unread = path === "notifications" ? unreadNotifications : 0;
                  return (
                    <NavLink
                      key={path}
                      to={adminDestination(path, group.section, selectedStudentId)}
                      end={path === ""}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand ${active ? "bg-indigo-50 text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}
                    >
                      {active ? <span className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-brand" aria-hidden="true" /> : null}
                      <Icon size={18} className="shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                      <span className="min-w-0 flex-1 truncate">{title}</span>
                      {unread ? (
                        <span
                          className="min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-5 text-white"
                          aria-label={`${unread.toLocaleString("fa-IR")} اعلان خوانده‌نشده`}
                        >
                          {Math.min(unread, 99).toLocaleString("fa-IR")}
                          {unread > 99 ? "+" : ""}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>
    </div>
  );
}

export function AdminMobileBottomNav({
  current,
  selectedStudentId,
}: {
  current: AdminCurrentNavigation;
  selectedStudentId: string;
}) {
  const auth = useAuth();
  const visibleMainNavigation = navigationForCapabilities(auth.capabilities).map((group) => ({ ...group.items[0], section:group.section }));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.05)] backdrop-blur lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
      aria-label="مسیرهای اصلی مدیریت"
    >
      {visibleMainNavigation.map(({ path, title, section, icon: Icon }) => {
        const active = current.section === section;
        const destinationPath = active ? current.path : path;
        return (
          <NavLink
            key={section}
            to={adminDestination(destinationPath, section, selectedStudentId)}
            end={destinationPath === ""}
            aria-current={active ? "location" : undefined}
            aria-label={title}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand sm:text-[11px] ${active ? "bg-indigo-50 text-brand" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Icon size={19} strokeWidth={active ? 2.5 : 1.9} />
            <span className="max-w-full truncate">{title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
