import { Bell, Inbox } from "lucide-react";
import { Badge } from "../../../shared/ui/ui";

export function MobileNotificationTabs({
  panel,
  inboxCount,
  onChange,
}: {
  panel: "notifications" | "inbox";
  inboxCount: number;
  onChange: (panel: "notifications" | "inbox") => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="بخش اعلان‌ها"
      className="flex shrink-0 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 lg:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={panel === "notifications"}
        className={[
          "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs transition",
          panel === "notifications"
            ? "bg-white font-bold shadow-sm dark:bg-slate-700 dark:text-white"
            : "text-slate-500 dark:text-slate-400",
        ].join(" ")}
        onClick={() => onChange("notifications")}
      >
        <Bell size={14} />
        اعلان‌ها
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={panel === "inbox"}
        className={[
          "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs transition",
          panel === "inbox"
            ? "bg-white font-bold shadow-sm dark:bg-slate-700 dark:text-white"
            : "text-slate-500 dark:text-slate-400",
        ].join(" ")}
        onClick={() => onChange("inbox")}
      >
        <Inbox size={14} />
        پیگیری
        <Badge tone={inboxCount ? "red" : "green"}>
          {inboxCount.toLocaleString("fa-IR")}
        </Badge>
      </button>
    </div>
  );
}
