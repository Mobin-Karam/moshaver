import { Search } from "lucide-react";
import type { ConversationFilter } from "../../model/chat.types";

const filters: Array<[ConversationFilter, string]> = [
  ["all", "همه"],
  ["unread", "خوانده‌نشده"],
  ["favorites", "مهم"],
  ["drafts", "پیش‌نویس"],
  ["online", "آنلاین"],
  ["direct", "دانش‌آموزان"],
  ["group", "گروه‌ها"],
];

export function ConversationSearch({ search, filter, onSearch, onFilter }: {
  search: string;
  filter: ConversationFilter;
  onSearch: (value: string) => void;
  onFilter: (value: ConversationFilter) => void;
}) {
  return (
    <>
      <label className="mt-3 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
        <Search size={16} className="text-slate-400" />
        <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="نام، پایه یا متن آخرین پیام" aria-label="جستجوی گفتگوها" />
        {search ? <button type="button" className="text-[11px] text-slate-400 hover:text-slate-700" onClick={() => onSearch("")}>پاک</button> : null}
      </label>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1" aria-label="فیلتر گفتگوها">
        {filters.map(([value, label]) => (
          <button type="button" key={value} aria-pressed={filter === value} onClick={() => onFilter(value)} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${filter === value ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
