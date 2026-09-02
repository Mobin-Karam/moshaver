import {
  Bell,
  CheckCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  Dispatch,
  SetStateAction,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import { useLocale } from "../../../shared/ui/locale";
import {
  Badge,
  Button,
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
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
  mobilePanel:
    | "notifications"
    | "inbox";
  filter: "all" | "unread";
  setFilter: Dispatch<
    SetStateAction<
      "all" | "unread"
    >
  >;
  typeFilter: string;
  setTypeFilter: Dispatch<
    SetStateAction<string>
  >;
  search: string;
  setSearch: Dispatch<
    SetStateAction<string>
  >;
  items: ReturnType<
    typeof useAdminNotifications
  >["items"];
}) {
  const notifications =
    useAdminNotifications();

  const {
    formatDateTime,
  } = useLocale();

  const navigate =
    useNavigate();

  return (
    <Card
      className={[
        mobilePanel === "inbox"
          ? "hidden lg:flex"
          : "flex",
        "min-h-0 flex-col overflow-hidden p-3",
      ].join(" ")}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <Bell size={18} />

        <h3 className="font-bold">
          اعلان‌های مدیر
        </h3>

        <div className="mr-auto flex rounded-md bg-slate-100 p-1">
          <button
            className={[
              "rounded px-3 py-1 text-xs",
              filter === "all"
                ? "bg-white font-bold text-brand shadow-sm"
                : "text-slate-500",
            ].join(" ")}
            onClick={() =>
              setFilter("all")
            }
          >
            همه
          </button>

          <button
            className={[
              "rounded px-3 py-1 text-xs",
              filter ===
              "unread"
                ? "bg-white font-bold text-brand shadow-sm"
                : "text-slate-500",
            ].join(" ")}
            onClick={() =>
              setFilter(
                "unread",
              )
            }
          >
            خوانده‌نشده

            <span className="mr-1 rounded-full bg-rose-600 px-1.5 text-white">
              {notifications.unread.toLocaleString(
                "fa-IR",
              )}
            </span>
          </button>
        </div>

        {notifications.unread ? (
          <Button
            className="h-8 px-2 text-xs"
            variant="ghost"
            onClick={
              notifications.markAllRead
            }
          >
            <CheckCheck
              size={15}
            />
            خواندن همه
          </Button>
        ) : null}

        <Button
          className="h-8 px-2"
          variant="ghost"
          aria-label="تازه‌سازی"
          onClick={
            notifications.refresh
          }
        >
          <RefreshCw
            size={15}
          />
        </Button>
      </header>

      <div className="mb-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="flex h-9 items-center gap-2 rounded-md border bg-slate-50 px-3">
          <Search
            size={15}
            className="text-slate-400"
          />

          <input
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="جستجو در اعلان‌های بارگذاری‌شده"
            aria-label="جستجوی اعلان‌ها"
          />
        </label>

        <select
          className="h-9 rounded-md border bg-white px-2 text-xs"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value,
            )
          }
          aria-label="نوع اعلان"
        >
          <option value="all">
            همه نوع‌ها
          </option>

          <option value="message">
            پیام
          </option>

          <option value="exam">
            آزمون
          </option>

          <option value="lesson">
            برنامه
          </option>

          <option value="announcement">
            اطلاعیه
          </option>
        </select>
      </div>

      {notifications.loading ? (
        <NotificationSkeletons />
      ) : notifications.error ? (
        <EmptyState
          title="دریافت اعلان‌ها ناموفق بود."
          action={
            <Button
              variant="soft"
              onClick={
                notifications.refresh
              }
            >
              تلاش دوباره
            </Button>
          }
        />
      ) : items.length ? (
        <div className="grid min-h-0 gap-1 overflow-y-auto overscroll-contain pl-1">
          {items.map((item) => (
            <button
              key={item.id}
              style={{
                contentVisibility:
                  "auto",
                containIntrinsicSize:
                  "76px",
              }}
              className={[
                "rounded-lg border px-3 py-2 text-right transition hover:border-brand",
                item.isRead
                  ? "bg-white"
                  : "border-indigo-200 bg-indigo-50/70",
              ].join(" ")}
              onClick={() => {
                if (
                  !item.isRead
                ) {
                  notifications.markRead(
                    item.id,
                  );
                }

                navigate(
                  notificationAdminUrl(
                    item.url,
                  ),
                );
              }}
            >
              <span className="flex items-center gap-2">
                <strong className="min-w-0 flex-1 truncate text-sm">
                  {item.title}
                </strong>

                <Badge
                  tone={notificationTone(
                    item.type,
                  )}
                >
                  {notificationTypeLabel(
                    item.type,
                  )}
                </Badge>

                {!item.isRead ? (
                  <span
                    className="size-2 rounded-full bg-rose-600"
                    aria-label="خوانده‌نشده"
                  />
                ) : null}
              </span>

              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                {item.body}
              </p>

              <small className="text-[10px] text-slate-400">
                {formatDateTime(
                  item.createdAt,
                )}
              </small>
            </button>
          ))}

          {notifications.hasMore ? (
            <Button
              variant="soft"
              loading={
                notifications.loadingMore
              }
              onClick={
                notifications.loadMore
              }
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
              : search ||
                  typeFilter !==
                    "all"
                ? "اعلانی مطابق فیلتر پیدا نشد."
                : "اعلانی وجود ندارد."
          }
        />
      )}
    </Card>
  );
}
