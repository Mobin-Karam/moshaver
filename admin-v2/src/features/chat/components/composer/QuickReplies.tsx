export const defaultQuickReplies = [
  "برنامه امروزت را انجام دادی؟",
  "اگر بخشی سخت بود، بگو تا اصلاحش کنم.",
  "نتیجه آزمون را برایم بفرست.",
];

export function QuickReplies({ onSelect, items = defaultQuickReplies }: {
  onSelect: (value: string) => void;
  items?: string[];
}) {
  return <div className="flex gap-2 overflow-x-auto px-3 pt-2">{items.map((item) => <button key={item} type="button" className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200" onClick={() => onSelect(item)}>{item}</button>)}</div>;
}
