import { LoaderCircle, Send } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { ChatMessage } from "../../../../shared/types/domain";
import { Textarea } from "../../../../shared/ui/ui";

import { EditPreview } from "./EditPreview";
import { QuickReplies } from "./QuickReplies";
import { ReplyPreview } from "./ReplyPreview";

export function MessageComposer({
  conversationId,
  personName,
  value,
  replyTo,
  editing,
  busy,
  disabled,
  onChange,
  onSubmit,
  onCancelContext,
}: {
  conversationId: string;
  personName?: string;
  value: string;
  replyTo: ChatMessage | null;
  editing: ChatMessage | null;
  busy: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancelContext: () => void;
}) {
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && (replyTo || editing)) {
      event.preventDefault();
      onCancelContext();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="chat-surface shrink-0 border-t border-slate-200/80 shadow-[0_-8px_24px_rgba(31,49,46,0.04)]">
      <QuickReplies personName={personName} onSelect={(item) => onChange(value.trim() ? `${value.trim()}\n${item}` : item)} />
      {editing ? <EditPreview message={editing} onClose={onCancelContext} /> : replyTo ? <ReplyPreview message={replyTo} onClose={onCancelContext} /> : null}
      <form className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 p-3" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <div>
          <Textarea
            key={conversationId}
            aria-label="متن پیام"
            className="max-h-36 min-h-11 resize-none overflow-y-auto rounded-xl py-2 shadow-inner"
            rows={1}
            maxLength={3000}
            value={value}
            onChange={(event) => { const node = event.currentTarget; node.style.height = "auto"; node.style.height = `${Math.min(node.scrollHeight, 144)}px`; onChange(node.value); }}
            onKeyDown={keyDown}
            placeholder="پیام… (Shift+Enter برای خط جدید)"
            disabled={disabled}
          />
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>Enter ارسال • Shift+Enter خط جدید • Esc لغو پاسخ/ویرایش</span>
            <span className={value.length > 2800 ? "text-amber-700" : ""} dir="ltr">{value.length}/3000</span>
          </div>
        </div>
        <button className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-sm transition hover:brightness-90 active:scale-95 disabled:opacity-50" disabled={!value.trim() || busy || disabled} aria-label={editing ? "ذخیره ویرایش پیام" : "ارسال پیام"} title="ارسال (Enter)">
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
