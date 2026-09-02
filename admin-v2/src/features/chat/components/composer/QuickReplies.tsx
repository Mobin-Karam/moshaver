export const defaultQuickReplies = [
  "برنامه امروزت را انجام دادی؟",
  "اگر بخشی سخت بود، بگو تا اصلاحش کنم.",
  "نتیجه آزمون را برایم بفرست.",
];

export function QuickReplies({ onSelect, items = defaultQuickReplies }: {
  onSelect: (value: string) => void;
  items?: string[];
}) {
  return <div className="flex gap-2 overflow-x-auto px-3 pt-2" aria-label="پاسخ‌های سریع">{items.map((item) => <button key={item} type="button" className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:hover:bg-teal-950 dark:hover:text-teal-200" onClick={() => onSelect(item)}>{item}</button>)}</div>;
}
