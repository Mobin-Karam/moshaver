import {
  AlertCircle,
  Bell,
  CheckCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  Dispatch,
  SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../../shared/ui/locale";
import {
  Badge,
  Button,
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import type { AdminNotification } from "../model/notification-model";
import {
  notificationAdminUrl,
  notificationTone,
  notificationTypeLabel,
} from "../model/notification-model";
import { NotificationSkeletons } from "./NotificationSkeletons";

export function NotificationCenterPanel({
  mobilePanel,
  filter,
  setFilter,
  typeFilter,
  setTypeFilter,
  search,
  setSearch,
  items,
}: {
  mobilePanel: "notifications" | "inbox";
  filter: "all" | "unread";
  setFilter: Dispatch<SetStateAction<"all" | "unread">>;
  typeFilter: string;
  setTypeFilter: Dispatch<SetStateAction<string>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  items: AdminNotification[];
}) {
  const notifications = useAdminNotifications();
  const { formatDateTime } = useLocale();
  const navigate = useNavigate();

  return (
    <Card
      className={[
        mobilePanel === "inbox" ? "hidden lg:flex" : "flex",
        "min-h-0 flex-col overflow-hidden p-3 dark:border-slate-800 dark:bg-slate-900",
      ].join(" ")}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <Bell size={18} className="text-brand" />
        <h3 className="font-bold text-slate-900 dark:text-white">اعلان‌های مدیر</h3>

        <div className="mr-auto flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            aria-pressed={filter === "all"}
            className={[
              "rounded-md px-3 py-1 text-xs transition",
              filter === "all"
                ? "bg-white font-bold text-brand shadow-sm dark:bg-slate-700"
                : "text-slate-500 dark:text-slate-400",
            ].join(" ")}
            onClick={() => setFilter("all")}
          >
            همه
          </button>

          <button
            type="button"
            aria-pressed={filter === "unread"}
            className={[
              "rounded-md px-3 py-1 text-xs transition",
              filter === "unread"
                ? "bg-white font-bold text-brand shadow-sm dark:bg-slate-700"
                : "text-slate-500 dark:text-slate-400",
            ].join(" ")}
            onClick={() => setFilter("unread")}
          >
            خوانده‌نشده
            {notifications.unread > 0 ? (
              <span className="mr-1 rounded-full bg-rose-600 px-1.5 text-white">
                {notifications.unread.toLocaleString("fa-IR")}
              </span>
            ) : null}
          </button>
        </div>

        {notifications.unread ? (
          <Button
            className="h-8 px-2 text-xs"
            variant="ghost"
            loading={notifications.markingAllRead}
            onClick={notifications.markAllRead}
          >
            <CheckCheck size={15} />
            خواندن همه
          </Button>
        ) : null}

        <Button
          className="h-8 px-2"
          variant="ghost"
          aria-label="تازه‌سازی اعلان‌ها"
          loading={notifications.refreshing}
          onClick={notifications.refresh}
        >
          <RefreshCw size={15} />
        </Button>
      </header>

      <div className="mb-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
          <Search size={15} className="text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجو در اعلان‌های بارگذاری‌شده"
            aria-label="جستجوی اعلان‌ها"
          />
        </label>

        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          aria-label="نوع اعلان"
        >
          <option value="all">همه نوع‌ها</option>
          <option value="message">پیام</option>
          <option value="exam">آزمون</option>
          <option value="lesson">برنامه</option>
          <option value="announcement">اطلاعیه</option>
        </select>
      </div>

      {notifications.loading ? (
        <NotificationSkeletons />
      ) : notifications.error ? (
        <div className="grid min-h-0 place-items-center p-3">
          <div className="grid max-w-sm gap-3 text-center">
            <AlertCircle className="mx-auto text-rose-500" size={28} />
            <EmptyState
              title={notifications.errorMessage || "دریافت اعلان‌ها ناموفق بود."}
              action={
                <Button variant="soft" onClick={notifications.refresh}>
                  تلاش دوباره
                </Button>
              }
            />
          </div>
        </div>
      ) : items.length ? (
        <div className="grid min-h-0 gap-1 overflow-y-auto overscroll-contain pl-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "76px",
              }}
              className={[
                "rounded-xl border px-3 py-2 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
                item.isRead
                  ? "border-slate-200 bg-white hover:border-brand dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand"
                  : "border-indigo-200 bg-indigo-50/70 hover:border-brand dark:border-indigo-900 dark:bg-indigo-950/20",
              ].join(" ")}
              onClick={() => {
                if (!item.isRead) {
                  notifications.markRead(item.id);
                }
                navigate(notificationAdminUrl(item.url ?? undefined));
              }}
            >
              <span className="flex items-center gap-2">
                <strong className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-white">
                  {item.title}
                </strong>
                <Badge tone={notificationTone(item.type)}>
                  {notificationTypeLabel(item.type)}
                </Badge>
                {!item.isRead ? (
                  <span
                    className="size-2 rounded-full bg-rose-600"
                    aria-label="خوانده‌نشده"
                  />
                ) : null}
              </span>

              {item.body ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {item.body}
                </p>
              ) : null}

              {item.createdAt ? (
                <small className="text-[10px] text-slate-400">
                  {formatDateTime(item.createdAt)}
                </small>
              ) : null}
            </button>
          ))}

          {notifications.hasMore ? (
            <Button
              variant="soft"
              loading={notifications.loadingMore}
              onClick={notifications.loadMore}
            >
              نمایش اعلان‌های بیشتر
            </Button>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title={
            filter === "unread"
              ? "همه اعلان‌ها خوانده شده‌اند."
              : search || typeFilter !== "all"
                ? "اعلانی مطابق فیلتر پیدا نشد."
                : "اعلانی وجود ندارد."
          }
        />
      )}
    </Card>
  );
}
