import { Pause, Play, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useCountdownTimer } from "../hooks/useCountdownTimer";
import { formatDuration } from "../lib/time";

const PRESETS = [60, 5 * 60, 10 * 60, 25 * 60, 45 * 60, 60 * 60];

export function TimerPanel() {
  const timer = useCountdownTimer(200);
  const initial = useMemo(() => Math.max(1, Math.round(timer.durationMs / 60_000)), [timer.durationMs]);
  const [customMinutes, setCustomMinutes] = useState(initial);

  const setMinutes = (minutes: number) => {
    const safe = Math.min(24 * 60, Math.max(1, Math.round(minutes)));
    setCustomMinutes(safe);
    timer.setDurationMs(safe * 60_000);
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl px-3 py-5 text-center ${timer.status === "finished" ? "bg-rose-50 dark:bg-rose-950/20" : "bg-slate-50 dark:bg-slate-950/45"}`}>
        <div dir="ltr" className={`font-mono text-4xl font-black tabular-nums tracking-widest ${timer.status === "finished" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
          {formatDuration(timer.remainingMs)}
        </div>
        <div className="mt-2 text-[10px] font-semibold text-slate-400">
          {timer.status === "running" && "در حال اجرا — حتی با بستن پنل ادامه می‌دهد"}
          {timer.status === "paused" && "مکث شده — زمان باقی‌مانده ذخیره شده است"}
          {timer.status === "finished" && "زمان تمام شد"}
          {timer.status === "idle" && "آماده شروع"}
        </div>
      </div>

      {timer.status !== "running" && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((seconds) => (
              <button key={seconds} type="button" onClick={() => setMinutes(seconds / 60)} className={`min-h-9 rounded-lg border text-[11px] font-bold transition ${timer.durationMs === seconds * 1000 ? "border-brand/40 bg-brand/10 text-brand" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-brand/40 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                {seconds < 3600 ? `${seconds / 60} دقیقه` : `${seconds / 3600} ساعت`}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">زمان دلخواه</span>
            <input type="number" min={1} max={1440} value={customMinutes} onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomMinutes(Number(event.target.value))} className="mr-auto h-8 w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center font-mono text-xs font-bold outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900" dir="ltr" />
            <span className="text-[10px] text-slate-400">دقیقه</span>
            <button type="button" onClick={() => setMinutes(customMinutes)} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[10px] font-bold text-slate-600 hover:text-brand dark:bg-slate-700 dark:text-slate-200">اعمال</button>
          </label>
        </>
      )}

      <div className="flex justify-center gap-2">
        <button type="button" onClick={timer.status === "running" ? timer.pause : timer.start} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50">
          {timer.status === "running" ? <><Pause size={17} /> توقف</> : <><Play size={17} /> {timer.status === "paused" ? "ادامه" : timer.status === "finished" ? "شروع دوباره" : "شروع"}</>}
        </button>
        <button type="button" onClick={timer.reset} className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" aria-label="ریست تایمر"><RotateCcw size={17} /></button>
      </div>
    </div>
  );
}
