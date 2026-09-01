import { ArrowRight, CheckCheck, LoaderCircle } from "lucide-react";
import type { Conversation } from "../../../../shared/types/domain";
import type { GroupDetail } from "../../model/group.types";
import { GroupInfoButton } from "../group/GroupChatControls";

export function ChatHeader({ conversation, group, groupLoading, markingRead, onBack, onMarkRead, onGroupChanged }: {
  conversation: Conversation; group?: GroupDetail; groupLoading: boolean; markingRead: boolean;
  onBack: () => void; onMarkRead: () => void; onGroupChanged: () => void;
}) {
  return <div className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-3 sm:px-4"><div className="flex min-w-0 items-center gap-2"><button className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-slate-100 lg:hidden" aria-label="بازگشت به گفتگوها" onClick={onBack}><ArrowRight size={19} /></button><div className="min-w-0"><strong className="block truncate">{conversation.type === "group" ? conversation.title : conversation.student?.name || "گفتگو"}</strong><span className={`text-xs ${conversation.presence?.online ? "text-emerald-600" : "text-slate-500"}`}>{conversation.type === "group" ? `${conversation.memberCount || group?.memberCount || 0} عضو • ${groupLoading ? "در حال دریافت نقش" : group?.myRole === "owner" ? "مالک" : group?.myRole === "admin" ? "مدیر" : "عضو"}` : conversation.presence?.online ? "آنلاین" : conversation.student?.grade || "آفلاین"}</span></div></div><div className="flex items-center gap-1">{conversation.type === "group" ? <GroupInfoButton conversationId={conversation.id} onChanged={onGroupChanged} /> : null}<button type="button" className="flex shrink-0 items-center gap-1 text-xs text-slate-500" onClick={onMarkRead} disabled={markingRead || !conversation.unread}>{markingRead ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCheck size={17} />}<span className="hidden sm:inline">خوانده شد</span></button></div></div>;
}
