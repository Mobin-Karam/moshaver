import { SmilePlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../../api/chat.api";

const fallback = ["❤️", "👍", "😂", "👏", "😮", "😢", "🔥", "🎉", "🙏", "✅"];

export function EmojiReactionPicker({
  reacted,
  onReact,
}: {
  reacted: (emoji: string) => boolean;
  onReact: (emoji: string, remove: boolean) => void;
}) {
  const configuration = useQuery({
    queryKey: ["chat-configuration"],
    queryFn: chatApi.configuration,
    staleTime: 60_000,
  });
  const emojis = configuration.data?.allowedEmojis?.length
    ? configuration.data.allowedEmojis
    : fallback;
  return (
    <div className="flex items-center gap-0.5">
      {emojis.map((emoji) => (
        <button
          type="button"
          key={emoji}
          title={`واکنش ${emoji}`}
          aria-label={`واکنش ${emoji}`}
          className={`grid min-h-7 min-w-7 place-items-center rounded-md px-1 text-xs transition hover:bg-black/5 dark:hover:bg-white/10 ${reacted(emoji) ? "bg-brand/10 ring-1 ring-brand/20" : ""}`}
          onClick={() => onReact(emoji, reacted(emoji))}
        >
          {emoji}
        </button>
      ))}
      {configuration.isLoading ? <SmilePlus size={14} aria-label="در حال دریافت واکنش‌ها" /> : null}
    </div>
  );
}
