import { Users } from "lucide-react";
import type { Conversation } from "../../../../shared/types/domain";
import { Badge } from "../../../../shared/ui/ui";
import { formatConversationTime } from "../../lib/chat-formatters";

export function ConversationListItem({ item, active, onSelect }: {
  item: Conversation;
  active: boolean;
  onSelect: (item: Conversation) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item)}
      style={{ contentVisibility: "auto", containIntrinsicSize: "64px" }}
      className={`relative flex w-full items-center gap-3 border-b border-slate-100 p-3 text-right transition hover:bg-slate-50 ${active ? "bg-teal-50/80 dark:bg-teal-950/40" : ""}`}
    >
      {active ? <i className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-brand" aria-hidden="true" /> : null}
      <span className={`relative grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm ${item.type === "group" ? "bg-violet-600" : "bg-brand"}`}>
        {item.type === "group" ? <Users size={18} /> : (item.student?.name || "د").slice(0, 1)}
        {item.presence?.online ? <i className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-white bg-emerald-500" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate">{item.type === "group" ? item.title : item.student?.name || "دانش‌آموز"}</strong>
          <small className="shrink-0 text-[10px] text-slate-400">{formatConversationTime(item.lastMessage?.createdAt)}</small>
        </span>
        <small className="mt-1 block truncate text-slate-500">
          {item.lastMessage?.type && item.lastMessage.type !== "text" ? "پیام ساختاریافته" : item.lastMessage?.text || "هنوز پیامی ثبت نشده"}
        </small>
      </span>
      {item.unread ? <Badge tone="red">{item.unread}</Badge> : null}
    </button>
  );
}
