import { X } from "lucide-react";
import type { ChatMessage } from "../../../../shared/types/domain";

export function ReplyPreview({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  return <div className="mt-2 flex items-center gap-2 border-y border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100"><span className="min-w-0 flex-1 truncate">پاسخ به {message.senderName || "پیام"}: {message.text || "پیام ساختاریافته"}</span><button type="button" className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="لغو پاسخ" onClick={onClose}><X size={15} /></button></div>;
}
