import { LoaderCircle, Send } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { ChatMessage } from "../../../../shared/types/domain";
import { Textarea } from "../../../../shared/ui/ui";

import { EditPreview } from "./EditPreview";
import { QuickReplies } from "./QuickReplies";
import { ReplyPreview } from "./ReplyPreview";

export function MessageComposer({
  conversationId,
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }
  return (
    <div className="chat-surface shrink-0 border-t border-slate-200/80 shadow-[0_-8px_24px_rgba(31,49,46,0.04)]">
      <QuickReplies onSelect={(item) => onChange(value.trim() ? `${value.trim()}\n${item}` : item)} />
      {editing ? <EditPreview message={editing} onClose={onCancelContext} /> : replyTo ? <ReplyPreview message={replyTo} onClose={onCancelContext} /> : null}
      <form
        className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 p-3"
        onSubmit={(event) => { event.preventDefault(); onSubmit(); }}
      >
        <div>
          <Textarea
            key={conversationId}
            aria-label="متن پیام"
            className="max-h-28 min-h-11 resize-none rounded-xl py-2 shadow-inner"
            rows={1}
            maxLength={3000}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={keyDown}
            placeholder="پیام… (Shift+Enter برای خط جدید)"
            disabled={disabled}
          />
          <span className={`mt-1 block text-left text-[10px] ${value.length > 2800 ? "text-amber-700" : "text-slate-400"}`} dir="ltr">
            {value.length}/3000
          </span>
        </div>
        <button
          className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-sm transition hover:brightness-90 active:scale-95 disabled:opacity-50"
          disabled={!value.trim() || busy || disabled}
          aria-label={editing ? "ذخیره ویرایش پیام" : "ارسال پیام"}
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
