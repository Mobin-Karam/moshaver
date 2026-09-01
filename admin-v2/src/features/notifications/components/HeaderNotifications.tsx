import {
  Bell,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import {
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { useLocale } from "../../../shared/ui/locale";
import {
  Badge,
  Button,
  EmptyState,
} from "../../../shared/ui/ui";
import { ViewportPopover } from "../../../shared/ui/popover";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import {
  notificationAdminUrl,
  notificationTone,
  notificationTypeLabel,
} from "../model/notification-model";

export function HeaderNotifications() {
  const notifications =
    useAdminNotifications();

  const {
    formatDateTime,
  } = useLocale();

  const navigate =
    useNavigate();

  const [open, setOpen] =
    useState(false);

  return (
    <ViewportPopover
      open={open}
      onOpenChange={setOpen}
      width={360}
      className="overflow-hidden"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          className={[
            "relative grid size-9 place-items-center rounded-md border transition",
            notifications.unread
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          ].join(" ")}
          aria-label={`${notifications.unread.toLocaleString(
            "fa-IR",
          )} اعلان خوانده‌نشده`}
        >
          <Bell size={18} />

          {notifications.unread ? (
            <span className="absolute -left-2 -top-2 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black leading-5 text-white ring-2 ring-white">
              {Math.min(
                notifications.unread,
                99,
              ).toLocaleString(
                "fa-IR",
              )}
              {notifications.unread >
              99
                ? "+"
                : ""}
            </span>
          ) : null}
        </button>
      )}
    >
      <header className="flex items-center justify-between border-b p-3">
        <div>
          <strong>
            اعلان‌ها
          </strong>

          <p className="text-xs text-slate-500">
            {notifications.unread.toLocaleString(
              "fa-IR",
            )}{" "}
            خوانده‌نشده
          </p>
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
      </header>

      <div className="grid max-h-80 gap-1 overflow-y-auto p-2">
        {notifications.loading ? (
          [1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-md bg-slate-100"
              />
            ),
          )
        ) : notifications.items
            .length ? (
          notifications.items
            .slice(0, 6)
            .map((item) => (
              <button
                key={item.id}
                className={[
                  "rounded-lg p-2 text-right",
                  item.isRead
                    ? "hover:bg-slate-50"
                    : "bg-indigo-50 hover:bg-indigo-100",
                ].join(" ")}
                onClick={() => {
                  if (
                    !item.isRead
                  ) {
                    notifications.markRead(
                      item.id,
                    );
                  }

                  setOpen(false);

                  navigate(
                    notificationAdminUrl(
                      item.url,
                    ),
                  );
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <strong className="line-clamp-1 text-sm">
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
                </span>

                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {item.body}
                </p>

                <small className="text-[10px] text-slate-400">
                  {formatDateTime(
                    item.createdAt,
                  )}
                </small>
              </button>
            ))
        ) : (
          <EmptyState title="اعلان جدیدی وجود ندارد." />
        )}
      </div>

      <Link
        className="flex items-center justify-center gap-2 border-t p-3 text-xs font-bold text-brand hover:bg-indigo-50"
        to="/admin/notifications"
        onClick={() =>
          setOpen(false)
        }
      >
        مشاهده مرکز اعلان‌ها
        <ExternalLink
          size={14}
        />
      </Link>
    </ViewportPopover>
  );
}
