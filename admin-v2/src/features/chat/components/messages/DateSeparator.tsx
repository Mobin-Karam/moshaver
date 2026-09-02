import { formatDate } from "../../lib/chat-formatters";

export function DateSeparator({ value }: { value?: string }) {
  return <div className="sticky top-2 z-10 my-3 text-center"><span className="chat-surface rounded-full border border-slate-200/70 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">{formatDate(value)}</span></div>;
}
