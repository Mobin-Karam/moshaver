import { Check, CheckCheck, Pencil, Reply, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { ChatMessage } from "../../../../shared/types/domain";
import { formatTime, toFa } from "../../lib/chat-formatters";
import { showDateSeparator } from "../../lib/chat-helpers";
import { canUseMessageAction } from "../../model/permissions";
import type { GroupDetail } from "../../model/group.types";
import { DateSeparator } from "./DateSeparator";

type MessageAction = (
  method: "post" | "delete",
  path: string,
  body?: unknown,
) => void;

export function MessageList({
  items,
  authUserId,
  isGroup,
  group,
  setReplyTo,
  setEditing,
  act,
}: {
  items: ChatMessage[];
  authUserId?: string;
  isGroup: boolean;
  group?: GroupDetail;
  setReplyTo: (message: ChatMessage) => void;
  setEditing: (message: ChatMessage) => void;
  act: MessageAction;
}) {
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  return items.map((message, index) => {
    const mine = message.senderUserId
      ? message.senderUserId === authUserId
      : !isGroup && String(message.senderRole).toLowerCase() === "admin";
    const ready = !isGroup || !!group;
    const canEdit = !message.deletedAt && ready && canUseMessageAction("edit", mine, group);
    const canDelete = !message.deletedAt && ready && canUseMessageAction("delete", mine, group);
    const canReact = !message.deletedAt && ready && canUseMessageAction("react", mine, group);
    return (
      <div key={message.id} style={{ contentVisibility: "auto", containIntrinsicSize: "72px" }}>
        {showDateSeparator(items[index - 1], message) ? (
          <DateSeparator value={message.createdAt} />
        ) : null}
        <MessageBubble
          message={message}
          mine={mine}
          group={isGroup}
          referenced={message.replyToId ? byId.get(message.replyToId) : undefined}
          onReply={() => setReplyTo(message)}
          onEdit={canEdit ? () => setEditing(message) : undefined}
          onDelete={canDelete ? () => act("delete", `/chat/messages/${message.id}`) : undefined}
          onReact={canReact ? (emoji, remove) =>
            act(
              remove ? "delete" : "post",
              `/chat/messages/${message.id}/reactions${remove ? `/${encodeURIComponent(emoji)}` : ""}`,
              remove ? undefined : { emoji },
            ) : undefined}
        />
      </div>
    );
  });
}

export function MessageBubble({
  message,
  mine,
  group,
  referenced,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  message: ChatMessage;
  mine: boolean;
  group: boolean;
  referenced?: ChatMessage;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string, remove: boolean) => void;
}) {
  if (message.type === "system")
    return <div className="my-2 text-center"><span className="rounded-full bg-slate-700/75 px-3 py-1 text-xs text-white">{message.text}</span></div>;
  const reacted = (emoji: string) =>
    !!message.reactions?.find((item) => item.emoji === emoji)?.reacted;
  return (
    <div className={`group/message flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[76%] ${mine ? "bg-indigo-100" : "bg-white"} ${message.pending ? "opacity-70" : ""}`}>
        {group && !mine ? <strong className="mb-1 block text-xs text-indigo-700">{message.senderName || "عضو گروه"}</strong> : null}
        {message.replyToId ? <div className="mb-2 rounded border-r-2 border-brand bg-black/5 px-2 py-1 text-xs text-slate-600">↩ {referenced ? `${referenced.senderName || "عضو"}: ${referenced.text || "پیام ساختاریافته"}` : "پیام قبلی"}</div> : null}
        <MessageBody message={message} />
        {message.reactions?.length ? <div className="mt-2 flex flex-wrap gap-1">{message.reactions.map((reaction) => <button type="button" key={reaction.emoji} aria-label={`${reaction.emoji}، ${toFa(reaction.count)} واکنش`} disabled={!onReact} className={`rounded-full border px-2 py-0.5 text-xs disabled:cursor-default ${reaction.reacted ? "border-brand bg-indigo-50" : "bg-white"}`} onClick={() => onReact?.(reaction.emoji, !!reaction.reacted)}>{reaction.emoji} {toFa(reaction.count)}</button>)}</div> : null}
        <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400" dir="ltr">{message.pending ? "در حال ارسال" : formatTime(message.createdAt)}{message.editedAt ? " • ویرایش‌شده" : ""}{mine && !message.pending ? message.seen ? <CheckCheck size={13} className="text-sky-600" /> : <Check size={13} /> : null}</span>
        {!message.pending ? <div className="mt-1 flex items-center justify-end gap-2 border-t border-black/5 pt-1 text-[11px] text-slate-500 opacity-100 sm:opacity-0 sm:transition sm:group-hover/message:opacity-100"><button type="button" aria-label="پاسخ به پیام" onClick={onReply}><Reply size={13} /></button>{onReact ? ["❤️", "👍", "👏"].map((emoji) => <button type="button" aria-label={`واکنش ${emoji}`} key={emoji} onClick={() => onReact(emoji, reacted(emoji))}>{emoji}</button>) : null}{onEdit ? <button type="button" aria-label="ویرایش پیام" onClick={onEdit}><Pencil size={13} /></button> : null}{onDelete ? <button type="button" aria-label="حذف پیام" className="text-rose-700" onClick={onDelete}><Trash2 size={13} /></button> : null}</div> : null}
      </div>
    </div>
  );
}

export function MessageBody({ message }: { message: ChatMessage }) {
  if (message.deletedAt) return <p className="italic text-slate-400">پیام حذف شده است.</p>;
  const payload = message.payload || {};
  if (message.type && !["text", "system"].includes(message.type)) {
    const labels: Record<string, string> = { study_state: "📚 وضعیت مطالعه", exam_result: "📊 نتیجه آزمون", study_time: "⏱ زمان مطالعه", current_activity: "📖 فعالیت فعلی", learning_item: "🔁 مورد یادگیری" };
    return <StructuredMessage type={message.type} payload={payload} label={labels[message.type] || "اشتراک دانش‌آموز"} />;
  }
  return <p className="whitespace-pre-wrap break-words leading-7">{message.text}</p>;
}

export function StructuredMessage({ type, payload, label }: { type: string; payload: Record<string, unknown>; label: string }) {
  return <div data-message-type={type} className="grid gap-1 rounded-md border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-950"><strong>{label}</strong>{payload.title ? <b>{String(payload.title)}</b> : null}{payload.subject ? <span>درس: {String(payload.subject)}</span> : null}{payload.percent != null ? <span>نتیجه: {String(payload.percent)}٪</span> : null}{payload.studyMinutes != null ? <span>مطالعه امروز: {String(payload.studyMinutes)} دقیقه</span> : null}{payload.totalMinutes != null ? <span>مجموع مطالعه: {String(payload.totalMinutes)} دقیقه</span> : null}{payload.testCount != null ? <span>تعداد تست: {String(payload.testCount)}</span> : null}{payload.reviews != null ? <span>مرورهای سررسید: {String(payload.reviews)}</span> : null}{payload.minutes != null ? <span>مدت: {String(payload.minutes)} دقیقه</span> : null}</div>;
}

export function MessageSkeleton() {
  return <div className="grid gap-3">{["w-2/5", "mr-auto w-3/5", "w-1/2", "mr-auto w-2/5"].map((width, index) => <div key={index} className={`h-14 animate-pulse rounded-lg bg-white/70 ${width}`} />)}</div>;
}
