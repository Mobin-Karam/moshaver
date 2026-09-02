import { SmilePlus } from "lucide-react";
import { useState } from "react";

const common = ["❤️", "👍", "😂", "👏", "😮", "😢"];
const more = ["🔥", "🎉", "🙏", "✅", "💯", "🤝", "⭐", "💪"];

export function EmojiReactionPicker({ reacted, onReact }: { reacted: (emoji: string) => boolean; onReact: (emoji: string, remove: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const emojis = expanded ? [...common, ...more] : common;
  return (
    <div className="flex items-center gap-0.5">
      {emojis.map((emoji) => <button type="button" key={emoji} title={`واکنش ${emoji}`} aria-label={`واکنش ${emoji}`} className={`grid min-h-7 min-w-7 place-items-center rounded-md px-1 text-xs transition hover:bg-black/5 dark:hover:bg-white/10 ${reacted(emoji) ? "bg-brand/10 ring-1 ring-brand/20" : ""}`} onClick={() => onReact(emoji, reacted(emoji))}>{emoji}</button>)}
      <button type="button" title={expanded ? "واکنش‌های کمتر" : "واکنش‌های بیشتر"} aria-label={expanded ? "واکنش‌های کمتر" : "واکنش‌های بیشتر"} className="grid min-h-7 min-w-7 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setExpanded((value) => !value)}><SmilePlus size={14} /></button>
    </div>
  );
}
