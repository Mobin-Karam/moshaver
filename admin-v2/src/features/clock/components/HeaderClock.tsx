import {
  AlarmClock,
  BellRing,
  Clock3,
  Gauge,
  Globe2,
  Pause,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAlarms } from "../hooks/useAlarms";
import { useClockRuntime } from "../hooks/useClockRuntime";
import { useClockStore } from "../hooks/useClockStore";
import { useCountdownTimer } from "../hooks/useCountdownTimer";
import { useDigitalClock } from "../hooks/useDigitalClock";
import { usePlatformSession } from "../hooks/usePlatformSession";
import { useStopwatch } from "../hooks/useStopwatch";
import { clockActions } from "../lib/clock-store";
import {
  formatClockTime,
  formatCompactDuration,
  formatDuration,
  formatShortDate,
  getNextAlarmTimestamp,
} from "../lib/time";
import type { ClockTab, PlatformSessionStats } from "../model/clock.types";
import { AlarmPanel } from "./AlarmPanel";
import { SessionStats } from "./SessionStats";
import { StopwatchPanel } from "./StopwatchPanel";
import { TimerPanel } from "./TimerPanel";
import { WorldClockPanel } from "./WorldClockPanel";

export function HeaderClock({ userId }: { userId?: string }) {
  useClockRuntime();
  const now = useDigitalClock();
  const store = useClockStore();
  const stopwatch = useStopwatch(1000);
  const timer = useCountdownTimer(1000);
  const { alarms, activeAlarm } = useAlarms();
  const session = usePlatformSession(userId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const nextAlarm = useMemo(
    () =>
      alarms
        .map((alarm) => ({
          alarm,
          at: getNextAlarmTimestamp(alarm, now.getTime()),
        }))
        .filter(
          (entry): entry is { alarm: (typeof alarms)[number]; at: number } =>
            entry.at != null,
        )
        .sort((a, b) => a.at - b.at)[0],
    [alarms, now],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="ساعت و ابزارهای زمان"
        className="group flex h-10 max-w-[min(70vw,430px)] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 outline-none transition hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand dark:bg-brand/15">
          <Clock3 size={15} />
        </span>
        <span
          className="
    flex
    min-w-0
    items-center
    gap-2

    sm:gap-3
  "
        >
          {/* Clock */}
          <time
            dateTime={now.toISOString()}
            dir="ltr"
            className="
      shrink-0
      font-mono
      font-black
      tabular-nums
      tracking-tight

      text-lg
      text-slate-900

      dark:text-slate-100

      sm:text-2xl
      md:text-3xl
      lg:text-4xl
    "
          >
            {formatClockTime(now, store.preferences.hour12)}
          </time>

          {/* Info */}
          <span
            className={`
      flex
      min-w-0
      flex-col
      justify-center

      ${
        activeAlarm || timer.status === "finished"
          ? "text-rose-500"
          : "text-slate-400 dark:text-slate-500"
      }
    `}
          >
            <span
              className="
        max-w-24
        truncate

        text-[9px]
        font-bold

        sm:max-w-36
        sm:text-xs

        md:max-w-44
      "
            >
              {activeAlarm
                ? "هشدار فعال"
                : timer.status !== "idle"
                  ? `تایمر ${
                      timer.status === "finished"
                        ? "پایان"
                        : formatCompactDuration(timer.remainingMs)
                    }`
                  : stopwatch.running
                    ? `کرنومتر ${formatCompactDuration(stopwatch.elapsedMs)}`
                    : formatShortDate(now)}
            </span>

            <span
              className="
        mt-1
        hidden
        text-[9px]
        font-medium
        text-slate-400

        sm:block
        dark:text-slate-500
      "
            >
              {now.toLocaleDateString("fa-IR")}
            </span>
          </span>
        </span>

        <span className="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 lg:block" />
        <span className="hidden min-w-0 items-center gap-1 lg:flex">
          {stopwatch.running && (
            <HeaderStatus
              icon={<Gauge size={12} />}
              value={formatCompactDuration(stopwatch.elapsedMs)}
              title="کرنومتر در حال اجرا"
            />
          )}
          {timer.status !== "idle" && (
            <HeaderStatus
              icon={
                timer.status === "paused" ? (
                  <Pause size={11} />
                ) : (
                  <Timer size={12} />
                )
              }
              value={
                timer.status === "finished"
                  ? "پایان"
                  : formatCompactDuration(timer.remainingMs)
              }
              title={
                timer.status === "running"
                  ? "تایمر در حال اجرا"
                  : timer.status === "paused"
                    ? "تایمر متوقف شده"
                    : "تایمر پایان یافته"
              }
              attention={timer.status === "finished"}
            />
          )}
          {activeAlarm && (
            <HeaderStatus
              icon={<BellRing size={12} />}
              value="هشدار"
              title="هشدار فعال"
              attention
            />
          )}
          {!stopwatch.running &&
            timer.status === "idle" &&
            !activeAlarm &&
            nextAlarm && (
              <HeaderStatus
                icon={<AlarmClock size={12} />}
                value={new Intl.DateTimeFormat("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(nextAlarm.at))}
                title={`هشدار بعدی: ${nextAlarm.alarm.label}`}
              />
            )}
        </span>

        <span
          className={`ml-0.5 hidden size-1.5 shrink-0 rounded-full sm:block ${session.isActive ? "bg-emerald-500" : session.isIdle ? "bg-amber-500" : "bg-slate-400"}`}
          title={
            session.isIdle
              ? "کاربر غیرفعال است"
              : session.isActive
                ? "فعال"
                : "غیرفعال"
          }
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="مرکز زمان"
          className="absolute left-0 top-[calc(100%+0.6rem)] z-50 w-[min(94vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                مرکز زمان
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                ابزارها پس از بستن این پنل همچنان فعال می‌مانند
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="بستن"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1 border-b border-slate-200 bg-slate-50/70 p-1.5 dark:border-slate-700 dark:bg-slate-950/40">
            <TabButton
              active={store.selectedTab === "clock"}
              icon={<Clock3 size={14} />}
              onClick={() => clockActions.selectTab("clock")}
            >
              ساعت
            </TabButton>
            <TabButton
              active={store.selectedTab === "stopwatch"}
              icon={<Gauge size={14} />}
              badge={stopwatch.running}
              onClick={() => clockActions.selectTab("stopwatch")}
            >
              کرنومتر
            </TabButton>
            <TabButton
              active={store.selectedTab === "timer"}
              icon={<Timer size={14} />}
              badge={timer.status === "running" || timer.status === "finished"}
              onClick={() => clockActions.selectTab("timer")}
            >
              تایمر
            </TabButton>
            <TabButton
              active={store.selectedTab === "alarm"}
              icon={<AlarmClock size={14} />}
              badge={Boolean(activeAlarm)}
              onClick={() => clockActions.selectTab("alarm")}
            >
              هشدار
            </TabButton>
            <TabButton
              active={store.selectedTab === "world"}
              icon={<Globe2 size={14} />}
              onClick={() => clockActions.selectTab("world")}
            >
              جهانی
            </TabButton>
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto p-4">
            {store.selectedTab === "clock" && (
              <ClockOverview now={now} session={session} />
            )}
            {store.selectedTab === "stopwatch" && <StopwatchPanel />}
            {store.selectedTab === "timer" && <TimerPanel />}
            {store.selectedTab === "alarm" && <AlarmPanel />}
            {store.selectedTab === "world" && <WorldClockPanel now={now} />}
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderStatus({
  icon,
  value,
  title,
  attention = false,
}: {
  icon: ReactNode;
  value: string;
  title: string;
  attention?: boolean;
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-6 max-w-24 items-center gap-1 rounded-md px-1.5 font-mono text-[10px] font-bold tabular-nums ${attention ? "bg-rose-50 text-rose-600 dark:bg-rose-950/35 dark:text-rose-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
    >
      {icon}
      <span className="truncate">{value}</span>
    </span>
  );
}

function ClockOverview({
  now,
  session,
}: {
  now: Date;
  session: PlatformSessionStats;
}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const store = useClockStore();
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div
          dir="ltr"
          className="font-mono text-4xl font-black tabular-nums tracking-[0.08em] text-slate-900 dark:text-white"
        >
          {formatClockTime(now, store.preferences.hour12)}
        </div>
        <div className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {formatShortDate(now)}
        </div>
        <div dir="ltr" className="mt-1 text-[10px] text-slate-400">
          {timezone}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-brand/15 bg-brand/5 px-3 py-2.5 dark:bg-brand/10">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          زمان فعال این نشست
        </span>
        <strong dir="ltr" className="font-mono text-sm tabular-nums text-brand">
          {formatDuration(session.currentSessionMs)}
        </strong>
      </div>
      <SessionStats stats={session} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => clockActions.setHour12(!store.preferences.hour12)}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-right dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="block text-[10px] text-slate-400">قالب ساعت</span>
          <strong className="mt-1 block text-xs text-slate-700 dark:text-slate-100">
            {store.preferences.hour12 ? "۱۲ ساعته" : "۲۴ ساعته"}
          </strong>
        </button>
        <button
          type="button"
          onClick={() =>
            clockActions.setSoundEnabled(!store.preferences.soundEnabled)
          }
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-right dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="block text-[10px] text-slate-400">صدای ابزارها</span>
          <strong className="mt-1 block text-xs text-slate-700 dark:text-slate-100">
            {store.preferences.soundEnabled ? "روشن" : "خاموش"}
          </strong>
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
  badge = false,
}: {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={String(children)}
      className={`relative flex min-h-9 items-center justify-center gap-1 rounded-lg px-1 text-[9px] font-bold transition ${active ? "bg-white text-brand shadow-sm dark:bg-slate-800" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
    >
      {icon}
      <span className="hidden 2xl:inline">{children}</span>
      {badge && (
        <span className="absolute left-1 top-1 size-1.5 rounded-full bg-rose-500" />
      )}
    </button>
  );
}
