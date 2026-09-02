import { Star, Users } from "lucide-react";
import type { Conversation } from "../../../../shared/types/domain";
import { Badge } from "../../../../shared/ui/ui";
import { formatConversationTime } from "../../lib/chat-formatters";

export function ConversationListItem({ item, active, favorite, draft, onSelect, onToggleFavorite }: {
  item: Conversation;
  active: boolean;
  favorite: boolean;
  draft: string;
  onSelect: (item: Conversation) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const preview = draft.trim()
    ? `پیش‌نویس: ${draft.trim()}`
    : item.lastMessage?.type && item.lastMessage.type !== "text"
      ? "پیام ساختاریافته"
      : item.lastMessage?.text || "هنوز پیامی ثبت نشده";

  return (
    <div className={`group relative flex items-center border-b border-slate-100 transition hover:bg-slate-50 ${active ? "bg-teal-50/80 dark:bg-teal-950/40" : ""}`}>
      {active ? <i className="absolute inset-y-2 right-0 w-1 rounded-l-full bg-brand" aria-hidden="true" /> : null}
      <button
        onClick={() => onSelect(item)}
        style={{ contentVisibility: "auto", containIntrinsicSize: "64px" }}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 pl-1 text-right"
      >
        <span className={`relative grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm ${item.type === "group" ? "bg-violet-600" : "bg-brand"}`}>
          {item.type === "group" ? <Users size={18} /> : (item.student?.name || "د").slice(0, 1)}
          {item.presence?.online ? <i className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <strong className="truncate">{item.type === "group" ? item.title : item.student?.name || "دانش‌آموز"}</strong>
            <small className="shrink-0 text-[10px] text-slate-400">{formatConversationTime(item.lastMessage?.createdAt)}</small>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <small className={`block min-w-0 flex-1 truncate ${draft.trim() ? "font-semibold text-amber-700 dark:text-amber-300" : "text-slate-500"}`}>{preview}</small>
            {item.unread ? <Badge tone="red">{item.unread}</Badge> : null}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={favorite ? "حذف از مهم‌ها" : "افزودن به مهم‌ها"}
        title={favorite ? "حذف از مهم‌ها" : "افزودن به مهم‌ها"}
        onClick={() => onToggleFavorite(item.id)}
        className={`ml-2 grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10 ${favorite ? "text-amber-500" : "text-slate-300 opacity-70 group-hover:opacity-100"}`}
      >
        <Star size={15} fill={favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
