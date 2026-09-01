import { X } from "lucide-react";
import type { ChatMessage } from "../../../../shared/types/domain";

export function EditPreview({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  return <div className="mt-2 flex items-center gap-2 border-y bg-indigo-50 px-3 py-2 text-xs text-indigo-950"><span className="min-w-0 flex-1 truncate">ویرایش: {message.text}</span><button type="button" aria-label="لغو ویرایش" onClick={onClose}><X size={15} /></button></div>;
}
