export type ClockTab = "clock" | "stopwatch" | "timer" | "alarm" | "world";

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface StopwatchState {
  running: boolean;
  accumulatedMs: number;
  startedAt: number | null;
  laps: number[];
}

export interface CountdownTimerState {
  durationMs: number;
  remainingMs: number;
  targetAt: number | null;
  status: TimerStatus;
  completedAt: number | null;
}

export interface AlarmItem {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
  label: string;
  repeatDays: number[];
  snoozeMinutes: number;
  snoozedUntil: number | null;
  lastTriggeredKey: string | null;
}

export interface ActiveAlarm {
  alarmId: string;
  startedAt: number;
}

export interface WorldClockItem {
  id: string;
  label: string;
  timeZone: string;
}

export interface ClockPreferences {
  hour12: boolean;
  soundEnabled: boolean;
}

export interface ClockToolsState {
  version: 2;
  updatedAt: number;
  selectedTab: ClockTab;
  stopwatch: StopwatchState;
  timer: CountdownTimerState;
  alarms: AlarmItem[];
  activeAlarm: ActiveAlarm | null;
  worldClocks: WorldClockItem[];
  preferences: ClockPreferences;
}

export interface PlatformSessionStats {
  currentSessionMs: number;
  todayMs: number;
  totalMs: number;
  enteredAt: number;
  lastSeenAt: number;
  lastExitAt: number | null;
  isActive: boolean;
  isIdle: boolean;
}
