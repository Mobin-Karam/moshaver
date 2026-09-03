import { Globe2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { useWorldClocks } from "../hooks/useWorldClocks";
import { formatClockTime, getDayOffsetLabel } from "../lib/time";

const ZONES = [
  ["تهران", "Asia/Tehran"], ["دبی", "Asia/Dubai"], ["استانبول", "Europe/Istanbul"], ["برلین", "Europe/Berlin"],
  ["لندن", "Europe/London"], ["نیویورک", "America/New_York"], ["لس‌آنجلس", "America/Los_Angeles"], ["تورنتو", "America/Toronto"],
  ["توکیو", "Asia/Tokyo"], ["سئول", "Asia/Seoul"], ["سنگاپور", "Asia/Singapore"], ["سیدنی", "Australia/Sydney"],
] as const;

export function WorldClockPanel({ now }: { now: Date }) {
  const { items, add, remove } = useWorldClocks();
  const [zone, setZone] = useState("Asia/Dubai");
  const selected = ZONES.find((item) => item[1] === zone);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/70">
        <select value={zone} onChange={(event: ChangeEvent<HTMLSelectElement>) => setZone(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900">
          {ZONES.map(([label, timeZone]) => <option key={timeZone} value={timeZone}>{label} — {timeZone}</option>)}
        </select>
        <button type="button" onClick={() => selected && add(selected[0], selected[1])} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-white hover:bg-brand-strong"><Plus size={15} /> افزودن</button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand"><Globe2 size={15} /></span>
            <div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800 dark:text-white">{item.label}</div><div dir="ltr" className="truncate text-[9px] text-slate-400">{item.timeZone}</div></div>
            <div className="text-left"><strong dir="ltr" className="block font-mono text-sm tabular-nums text-slate-800 dark:text-slate-100">{formatClockTime(now, false, item.timeZone)}</strong><span className="text-[9px] text-slate-400">{getDayOffsetLabel(now, item.timeZone)}</span></div>
            <button type="button" onClick={() => remove(item.id)} className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label={`حذف ${item.label}`}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
