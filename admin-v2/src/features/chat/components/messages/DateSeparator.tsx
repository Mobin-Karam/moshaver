import { formatDate } from "../../lib/chat-formatters";

export function DateSeparator({ value }: { value?: string }) {
  return <div className="my-3 text-center"><span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-slate-500 shadow-sm">{formatDate(value)}</span></div>;
}
