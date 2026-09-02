import {
  Bell,
  Inbox,
} from "lucide-react";
import {
  Badge,
} from "../../../shared/ui/ui";

export function MobileNotificationTabs({
  panel,
  inboxCount,
  onChange,
}: {
  panel:
    | "notifications"
    | "inbox";
  inboxCount: number;
  onChange: (
    panel:
      | "notifications"
      | "inbox",
  ) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-lg bg-slate-100 p-1 lg:hidden">
      <button
        className={[
          "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs",
          panel ===
          "notifications"
            ? "bg-white font-bold shadow-sm"
            : "",
        ].join(" ")}
        onClick={() =>
          onChange(
            "notifications",
          )
        }
      >
        <Bell size={14} />
        اعلان‌ها
      </button>

      <button
        className={[
          "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-xs",
          panel === "inbox"
            ? "bg-white font-bold shadow-sm"
            : "",
        ].join(" ")}
        onClick={() =>
          onChange("inbox")
        }
      >
        <Inbox size={14} />
        پیگیری

        <Badge
          tone={
            inboxCount
              ? "red"
              : "green"
          }
        >
          {inboxCount.toLocaleString(
            "fa-IR",
          )}
        </Badge>
      </button>
    </div>
  );
}
