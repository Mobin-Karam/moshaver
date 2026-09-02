import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { toFa } from "../../lib/chat-formatters";

export function MessageSearchBar({ value, count, index, onChange, onNext, onPrevious, onClose }: {
  value: string;
  count: number;
  index: number;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}) {
  return (
    <div className="chat-surface flex shrink-0 items-center gap-2 border-b border-slate-200/80 px-3 py-2">
      <Search size={16} className="shrink-0 text-slate-400" />
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="جستجو در پیام‌های بارگذاری‌شده…"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        aria-label="جستجو در پیام‌ها"
      />
      <span className="shrink-0 text-[11px] text-slate-400" dir="ltr">{count ? `${toFa(index + 1)} / ${toFa(count)}` : "۰ / ۰"}</span>
      <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30" onClick={onPrevious} disabled={!count} aria-label="نتیجه قبلی"><ChevronUp size={16} /></button>
      <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30" onClick={onNext} disabled={!count} aria-label="نتیجه بعدی"><ChevronDown size={16} /></button>
      <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" onClick={onClose} aria-label="بستن جستجو"><X size={16} /></button>
    </div>
  );
}
