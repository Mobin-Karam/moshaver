import { LoaderCircle, Paperclip, Send, Smile } from "lucide-react";

import type { KeyboardEvent } from "react";

import { useEffect, useRef } from "react";

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
  onAfterSend,
}: {
  conversationId: string;
  personName?: string;

  value: string;

  replyTo: ChatMessage | null;
  editing: ChatMessage | null;

  busy: boolean;
  disabled: boolean;

  onChange: (value: string) => void;

  onSubmit: () => Promise<void> | void;

  onCancelContext: () => void;

  onAfterSend?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sendingRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(`chat-draft-${conversationId}`);

    if (saved && !value) {
      onChange(saved);
    }
  }, [conversationId]);

  useEffect(() => {
    if (value.trim()) {
      localStorage.setItem(`chat-draft-${conversationId}`, value);
    } else {
      localStorage.removeItem(`chat-draft-${conversationId}`);
    }
  }, [value, conversationId]);

  async function submit() {
    if (!value.trim() || busy || disabled || sendingRef.current) {
      return;
    }

    sendingRef.current = true;

    try {
      await onSubmit();

      localStorage.removeItem(`chat-draft-${conversationId}`);

      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onAfterSend?.();
        });
      });
    } finally {
      sendingRef.current = false;
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && (replyTo || editing)) {
      event.preventDefault();

      onCancelContext();

      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      void submit();
    }
  }

  function insertEmoji() {
    const emoji = "😊";

    onChange(`${value}${emoji}`);

    textareaRef.current?.focus();
  }

  return (
    <div
      className="
chat-surface
shrink-0

border-t
border-slate-200/80

pb-[env(safe-area-inset-bottom)]

dark:border-slate-800
"
    >
      <QuickReplies
        personName={personName}
        onSelect={(item) =>
          onChange(value.trim() ? `${value.trim()}\n${item}` : item)
        }
      />

      {editing ? (
        <EditPreview message={editing} onClose={onCancelContext} />
      ) : replyTo ? (
        <ReplyPreview message={replyTo} onClose={onCancelContext} />
      ) : null}

      <form
        className="
flex
items-end
gap-2
p-3
"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div
          className="
flex-1
"
        >
          <Textarea
            ref={textareaRef}
            value={value}
            rows={1}
            maxLength={3000}
            className="
max-h-36
min-h-11
resize-none
rounded-xl
"
            placeholder={disabled ? "ارسال پیام امکان‌پذیر نیست" : "پیام..."}
            disabled={disabled}
            onChange={(e) => {
              const node = e.currentTarget;

              node.style.height = "auto";

              node.style.height = `${Math.min(node.scrollHeight, 144)}px`;

              onChange(node.value);
            }}
            onKeyDown={keyDown}
          />

          <div
            className="
mt-1
flex
justify-between
text-[10px]
text-slate-400
"
          >
            <span>Shift+Enter خط جدید</span>

            <span dir="ltr">{value.length}/3000</span>
          </div>
        </div>

        <button
          type="button"
          className="
grid
size-10
rounded-xl
place-items-center
hover:bg-slate-100
dark:hover:bg-slate-800
"
          onClick={insertEmoji}
        >
          <Smile size={18} />
        </button>

        <button
          type="button"
          className="
grid
size-10
rounded-xl
place-items-center
hover:bg-slate-100
dark:hover:bg-slate-800
"
        >
          <Paperclip size={18} />
        </button>

        <button
          type="submit"
          disabled={!value.trim() || busy || disabled}
          className="
grid
size-11
place-items-center

rounded-xl

bg-brand
text-white

disabled:opacity-50
"
        >
          {busy ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  );
}
