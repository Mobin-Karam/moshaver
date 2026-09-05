import { Clock3, CornerDownLeft, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth";
import { normalizePersianText } from "../../shared/lib/utils";
import { adminDestination, navigationForCapabilities } from "./admin-navigation";
import { readStoredList, writeStoredList } from "./layout-storage";
import type { AdminCurrentNavigation } from "./layout-types";

const RECENT_NAVIGATION_KEY = "admin-recent-navigation";
const HOME_TOKEN = "__admin_home__";

function pathToken(path: string) {
  return path || HOME_TOKEN;
}

function tokenPath(token: string) {
  return token === HOME_TOKEN ? "" : token;
}

function focusableElements(root: HTMLElement | null) {
  if (!root) return [] as HTMLElement[];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function AdminCommandPalette({
  open,
  current,
  selectedStudentId,
  onClose,
}: {
  open: boolean;
  current: AdminCurrentNavigation;
  selectedStudentId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const availableNavigation = useMemo(() => navigationForCapabilities(auth.capabilities).flatMap((group) => group.items.map((item) => ({ ...item, section: group.section }))), [auth.capabilities]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentTokens, setRecentTokens] = useState(() => readStoredList(RECENT_NAVIGATION_KEY));

  useEffect(() => {
    const token = pathToken(current.path);
    setRecentTokens((previous) => {
      const next = [token, ...previous.filter((item) => item !== token)].slice(0, 8);
      writeStoredList(RECENT_NAVIGATION_KEY, next);
      return next;
    });
  }, [current.path]);

  const recentItems = useMemo(
    () =>
      recentTokens.flatMap((token) => {
        const path = tokenPath(token);
        const item = availableNavigation.find((candidate) => candidate.path === path);
        return item ? [item] : [];
      }),
    [recentTokens, availableNavigation],
  );

  const normalizedQuery = normalizePersianText(query.trim().toLowerCase());
  const results = useMemo(() => {
    if (!normalizedQuery) return recentItems.length ? recentItems : availableNavigation.slice(0, 8);
    return availableNavigation.filter((item) => {
      const haystack = normalizePersianText(
        `${item.title} ${item.description} ${item.section} ${item.path}`.toLowerCase(),
      );
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, recentItems, availableNavigation]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setActiveIndex(0);
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);

    function trapFocus(event: KeyboardEvent) {
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

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus);
      previousActive?.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const active = results[activeIndex];
    if (!active) return;
    document.getElementById(`admin-command-${pathToken(active.path)}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  function choose(index: number) {
    const item = results[index];
    if (!item) return;
    const token = pathToken(item.path);
    const nextRecent = [token, ...recentTokens.filter((value) => value !== token)].slice(0, 8);
    setRecentTokens(nextRecent);
    writeStoredList(RECENT_NAVIGATION_KEY, nextRecent);
    navigate(adminDestination(item.path, item.section, selectedStudentId));
    onClose();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((value) => Math.min(value + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((value) => Math.max(value - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/40 px-3 pt-[8dvh] backdrop-blur-sm" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="جستجو و رفتن سریع"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3">
          <Search size={19} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="نام صفحه، بخش یا مسیر را جستجو کنید…"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="admin-command-results"
            aria-activedescendant={results[activeIndex] ? `admin-command-${pathToken(results[activeIndex].path)}` : undefined}
          />
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 outline-none transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onClose}
            aria-label="بستن جستجو"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-bold">
            {!normalizedQuery ? <Clock3 size={12} /> : <Search size={12} />}
            {!normalizedQuery
              ? recentItems.length
                ? "مسیرهای اخیر"
                : "پیشنهادها"
              : `${results.length.toLocaleString("fa-IR")} نتیجه`}
          </span>
          <span className="hidden items-center gap-2 sm:flex" dir="rtl">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">↑ ↓</kbd> انتخاب
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Enter</kbd> بازکردن
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Esc</kbd> بستن
          </span>
        </div>

        <div id="admin-command-results" role="listbox" className="max-h-[min(60dvh,30rem)] overflow-y-auto overscroll-contain p-2">
          {results.length ? (
            results.map((item, index) => {
              const Icon = item.icon;
              const active = index === activeIndex;
              return (
                <button
                  id={`admin-command-${pathToken(item.path)}`}
                  key={`${item.section}-${item.path || "home"}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`mb-1 flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right outline-none transition last:mb-0 focus-visible:ring-2 focus-visible:ring-brand ${active ? "bg-indigo-50 text-brand" : "text-slate-700 hover:bg-slate-50"}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white" : "bg-slate-50"}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <strong className="truncate text-sm">{item.title}</strong>
                      <small className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">{item.section}</small>
                    </span>
                    <small className="mt-0.5 block truncate text-[10px] text-slate-400">{item.description}</small>
                  </span>
                  {active ? <CornerDownLeft size={15} className="shrink-0" /> : null}
                </button>
              );
            })
          ) : (
            <div className="grid min-h-36 place-items-center px-4 text-center text-sm text-slate-500">
              <div>
                <Search className="mx-auto mb-2" size={24} />
                مسیری با این عبارت پیدا نشد.
                <p className="mt-1 text-[11px] text-slate-400">نام بخش یا صفحه دیگری را امتحان کنید.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
