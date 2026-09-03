import type { AlarmItem, ClockTab, ClockToolsState } from "../model/clock.types";
import { CLOCK_TOOLS_STORAGE_KEY, createId, loadClockToolsState, saveClockToolsState } from "./clock-storage";
import { getAlarmMinuteKey, getStopwatchElapsed, getTimerRemaining } from "./time";

let state: ClockToolsState = loadClockToolsState();
const serverState = state;
const listeners = new Set<() => void>();
let storageListening = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(updater: (current: ClockToolsState) => ClockToolsState) {
  const next = updater(state);
  state = { ...next, version: 2, updatedAt: Date.now() };
  saveClockToolsState(state);
  emit();
}

function ensureStorageListener() {
  if (storageListening || typeof window === "undefined") return;
  storageListening = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== CLOCK_TOOLS_STORAGE_KEY || !event.newValue) return;
    try {
      const incoming = JSON.parse(event.newValue) as ClockToolsState;
      if (!incoming || incoming.version !== 2) return;
      if ((incoming.updatedAt ?? 0) < (state.updatedAt ?? 0)) return;
      state = incoming;
      emit();
    } catch {
      // Ignore malformed cross-tab data.
    }
  });
}

export function subscribeClockStore(listener: () => void) {
  ensureStorageListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClockStoreSnapshot() {
  return state;
}

export function getClockServerSnapshot() {
  return serverState;
}

export const clockActions = {
  selectTab(tab: ClockTab) {
    commit((current) => ({ ...current, selectedTab: tab }));
  },

  setHour12(hour12: boolean) {
    commit((current) => ({ ...current, preferences: { ...current.preferences, hour12 } }));
  },

  setSoundEnabled(soundEnabled: boolean) {
    commit((current) => ({ ...current, preferences: { ...current.preferences, soundEnabled } }));
  },

  startStopwatch(now = Date.now()) {
    commit((current) => {
      if (current.stopwatch.running) return current;
      return { ...current, stopwatch: { ...current.stopwatch, running: true, startedAt: now } };
    });
  },

  pauseStopwatch(now = Date.now()) {
    commit((current) => {
      if (!current.stopwatch.running) return current;
      const elapsed = getStopwatchElapsed(current.stopwatch, now);
      return { ...current, stopwatch: { ...current.stopwatch, running: false, accumulatedMs: elapsed, startedAt: null } };
    });
  },

  resetStopwatch() {
    commit((current) => ({ ...current, stopwatch: { running: false, accumulatedMs: 0, startedAt: null, laps: [] } }));
  },

  addStopwatchLap(now = Date.now()) {
    commit((current) => {
      const elapsed = getStopwatchElapsed(current.stopwatch, now);
      if (elapsed <= 0) return current;
      return { ...current, stopwatch: { ...current.stopwatch, laps: [elapsed, ...current.stopwatch.laps].slice(0, 50) } };
    });
  },

  setTimerDuration(durationMs: number) {
    const safe = Math.min(99 * 60 * 60_000, Math.max(1_000, Math.round(durationMs)));
    commit((current) => ({
      ...current,
      timer: { durationMs: safe, remainingMs: safe, targetAt: null, status: "idle", completedAt: null },
    }));
  },

  startTimer(now = Date.now()) {
    commit((current) => {
      const remaining = current.timer.status === "finished" || current.timer.remainingMs <= 0
        ? current.timer.durationMs
        : getTimerRemaining(current.timer, now);
      return {
        ...current,
        timer: { ...current.timer, remainingMs: remaining, targetAt: now + remaining, status: "running", completedAt: null },
      };
    });
  },

  pauseTimer(now = Date.now()) {
    commit((current) => {
      if (current.timer.status !== "running") return current;
      const remaining = getTimerRemaining(current.timer, now);
      return { ...current, timer: { ...current.timer, remainingMs: remaining, targetAt: null, status: "paused" } };
    });
  },

  resetTimer() {
    commit((current) => ({
      ...current,
      timer: { ...current.timer, remainingMs: current.timer.durationMs, targetAt: null, status: "idle", completedAt: null },
    }));
  },

  completeTimer(now = Date.now()) {
    commit((current) => {
      if (current.timer.status !== "running" || getTimerRemaining(current.timer, now) > 0) return current;
      return { ...current, timer: { ...current.timer, remainingMs: 0, targetAt: null, status: "finished", completedAt: now } };
    });
  },

  addAlarm(input: Pick<AlarmItem, "hour" | "minute" | "label" | "repeatDays" | "snoozeMinutes">) {
    const alarm: AlarmItem = {
      id: createId(),
      hour: Math.min(23, Math.max(0, input.hour)),
      minute: Math.min(59, Math.max(0, input.minute)),
      enabled: true,
      label: input.label.trim() || "هشدار",
      repeatDays: [...new Set(input.repeatDays)].filter((day) => day >= 0 && day <= 6).sort(),
      snoozeMinutes: Math.min(60, Math.max(1, input.snoozeMinutes)),
      snoozedUntil: null,
      lastTriggeredKey: null,
    };
    commit((current) => ({ ...current, alarms: [...current.alarms, alarm] }));
  },

  updateAlarm(id: string, patch: Partial<Omit<AlarmItem, "id">>) {
    commit((current) => ({
      ...current,
      alarms: current.alarms.map((alarm) => alarm.id === id ? { ...alarm, ...patch } : alarm),
    }));
  },

  toggleAlarm(id: string) {
    commit((current) => ({
      ...current,
      alarms: current.alarms.map((alarm) => alarm.id === id ? { ...alarm, enabled: !alarm.enabled, snoozedUntil: null } : alarm),
      activeAlarm: current.activeAlarm?.alarmId === id ? null : current.activeAlarm,
    }));
  },

  removeAlarm(id: string) {
    commit((current) => ({
      ...current,
      alarms: current.alarms.filter((alarm) => alarm.id !== id),
      activeAlarm: current.activeAlarm?.alarmId === id ? null : current.activeAlarm,
    }));
  },

  triggerAlarm(id: string, minuteKey: string, now = Date.now(), disableAfterTrigger = false) {
    commit((current) => ({
      ...current,
      alarms: current.alarms.map((alarm) => alarm.id === id
        ? { ...alarm, enabled: disableAfterTrigger ? false : alarm.enabled, lastTriggeredKey: minuteKey, snoozedUntil: null }
        : alarm),
      activeAlarm: { alarmId: id, startedAt: now },
    }));
  },

  dismissActiveAlarm() {
    commit((current) => ({ ...current, activeAlarm: null }));
  },

  snoozeActiveAlarm(now = Date.now()) {
    commit((current) => {
      const active = current.activeAlarm;
      if (!active) return current;
      return {
        ...current,
        activeAlarm: null,
        alarms: current.alarms.map((alarm) => alarm.id === active.alarmId
          ? { ...alarm, snoozedUntil: now + alarm.snoozeMinutes * 60_000 }
          : alarm),
      };
    });
  },

  addWorldClock(label: string, timeZone: string) {
    commit((current) => {
      if (current.worldClocks.some((item) => item.timeZone === timeZone)) return current;
      return { ...current, worldClocks: [...current.worldClocks, { id: createId(), label: label.trim() || timeZone, timeZone }] };
    });
  },

  removeWorldClock(id: string) {
    commit((current) => ({ ...current, worldClocks: current.worldClocks.filter((item) => item.id !== id) }));
  },
};

export function processClockRuntime(now = Date.now()) {
  const current = state;
  if (current.timer.status === "running" && getTimerRemaining(current.timer, now) <= 0) {
    clockActions.completeTimer(now);
  }

  if (getClockStoreSnapshot().activeAlarm) return;

  const date = new Date(now);
  const minuteKey = getAlarmMinuteKey(date);
  for (const alarm of getClockStoreSnapshot().alarms) {
    const snoozeDue = alarm.snoozedUntil != null && alarm.snoozedUntil <= now;
    if (!alarm.enabled && !snoozeDue) continue;

    const scheduledDue = alarm.enabled
      && alarm.hour === date.getHours()
      && alarm.minute === date.getMinutes()
      && (alarm.repeatDays.length === 0 || alarm.repeatDays.includes(date.getDay()));

    if (!snoozeDue && !scheduledDue) continue;
    const triggerKey = snoozeDue ? `${alarm.id}:snooze:${alarm.snoozedUntil}` : `${alarm.id}:${minuteKey}`;
    if (alarm.lastTriggeredKey === triggerKey) continue;
    const oneTimeAlarm = scheduledDue && alarm.repeatDays.length === 0;
    clockActions.triggerAlarm(alarm.id, triggerKey, now, oneTimeAlarm);
    break;
  }
}
