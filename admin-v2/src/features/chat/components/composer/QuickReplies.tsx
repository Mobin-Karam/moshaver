import { Plus, Settings2, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { fallbackQuickReplies, readQuickReplies, writeQuickReplies } from "../../lib/chat-ui-storage";

export const defaultQuickReplies = fallbackQuickReplies;

export function QuickReplies({ onSelect, personName }: {
  onSelect: (value: string) => void;
  personName?: string;
}) {
  const [items, setItems] = useState<string[]>(() => readQuickReplies());
  const [editing, setEditing] = useState(false);
  const [newReply, setNewReply] = useState("");
  const rendered = useMemo(() => items.map((item) => item.split("{name}").join(personName || "")), [items, personName]);

  function add() {
    const value = newReply.trim();
    if (!value || items.includes(value)) return;
    const next = [...items, value].slice(-20);
    setItems(next);
    writeQuickReplies(next);
    setNewReply("");
  }

  function remove(index: number) {
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    setItems(next.length ? next : fallbackQuickReplies);
    writeQuickReplies(next.length ? next : fallbackQuickReplies);
  }

  return (
    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" aria-label="پاسخ‌های سریع">
          {rendered.map((item, index) => <button key={`${items[index]}-${index}`} type="button" className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-teal-950 dark:hover:text-teal-200" onClick={() => onSelect(item)}>{item}</button>)}
        </div>
        <button type="button" title="مدیریت پاسخ‌های سریع" aria-label="مدیریت پاسخ‌های سریع" className={`grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800 ${editing ? "text-brand" : "text-slate-400"}`} onClick={() => setEditing((value) => !value)}>{editing ? <X size={15} /> : <Settings2 size={15} />}</button>
      </div>
      {editing ? <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex gap-2">
          <input value={newReply} onChange={(event) => setNewReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="پاسخ جدید؛ {name} با نام مخاطب جایگزین می‌شود" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand/50 dark:border-slate-700 dark:bg-slate-950" />
          <button type="button" onClick={add} disabled={!newReply.trim()} className="grid size-9 place-items-center rounded-lg bg-brand text-white disabled:opacity-40" aria-label="افزودن پاسخ سریع"><Plus size={16} /></button>
        </div>
        <div className="mt-2 grid gap-1">
          {items.map((item, index) => <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs dark:bg-slate-950"><span className="min-w-0 flex-1 truncate">{item}</span><button type="button" onClick={() => remove(index)} className="grid size-7 place-items-center rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label="حذف پاسخ سریع"><Trash2 size={13} /></button></div>)}
        </div>
      </div> : null}
    </div>
  );
}
