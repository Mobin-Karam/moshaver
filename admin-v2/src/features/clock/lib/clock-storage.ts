import type { AlarmItem, ClockToolsState, WorldClockItem } from "../model/clock.types";
import { getTodayKey } from "./time";

export const CLOCK_TOOLS_STORAGE_KEY = "ravin:clock:tools:v2";
const SESSION_STORAGE_PREFIX = "ravin:clock:session:v2";
const TAB_SESSION_PREFIX = "ravin:clock:tab-session";

export interface StoredPlatformSession {
  version: 2;
  todayKey: string;
  todayMs: number;
  totalMs: number;
  lastSeenAt: number;
  lastExitAt: number | null;
}

export interface TabSessionIdentity {
  id: string;
  enteredAt: number;
  activeMs: number;
}

const DEFAULT_WORLD_CLOCKS: WorldClockItem[] = [
  { id: "tehran", label: "تهران", timeZone: "Asia/Tehran" },
  { id: "berlin", label: "برلین", timeZone: "Europe/Berlin" },
  { id: "london", label: "لندن", timeZone: "Europe/London" },
  { id: "new-york", label: "نیویورک", timeZone: "America/New_York" },
];

export function createDefaultClockToolsState(): ClockToolsState {
  return {
    version: 2,
    updatedAt: Date.now(),
    selectedTab: "clock",
    stopwatch: { running: false, accumulatedMs: 0, startedAt: null, laps: [] },
    timer: { durationMs: 5 * 60_000, remainingMs: 5 * 60_000, targetAt: null, status: "idle", completedAt: null },
    alarms: [],
    activeAlarm: null,
    worldClocks: DEFAULT_WORLD_CLOCKS,
    preferences: { hour12: false, soundEnabled: true },
  };
}

function normalizeAlarm(item: Partial<AlarmItem>): AlarmItem | null {
  if (!item.id || !Number.isFinite(item.hour) || !Number.isFinite(item.minute)) return null;
  return {
    id: String(item.id),
    hour: Math.min(23, Math.max(0, Number(item.hour))),
    minute: Math.min(59, Math.max(0, Number(item.minute))),
    enabled: item.enabled !== false,
    label: typeof item.label === "string" && item.label.trim() ? item.label : "هشدار",
    repeatDays: Array.isArray(item.repeatDays) ? item.repeatDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [],
    snoozeMinutes: Number.isFinite(item.snoozeMinutes) ? Math.min(60, Math.max(1, Number(item.snoozeMinutes))) : 5,
    snoozedUntil: Number.isFinite(item.snoozedUntil) ? Number(item.snoozedUntil) : null,
    lastTriggeredKey: typeof item.lastTriggeredKey === "string" ? item.lastTriggeredKey : null,
  };
}

export function loadClockToolsState(): ClockToolsState {
  const fallback = createDefaultClockToolsState();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(CLOCK_TOOLS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ClockToolsState>;
      return {
        ...fallback,
        ...parsed,
        version: 2,
        stopwatch: { ...fallback.stopwatch, ...(parsed.stopwatch ?? {}) },
        timer: { ...fallback.timer, ...(parsed.timer ?? {}) },
        alarms: Array.isArray(parsed.alarms) ? parsed.alarms.map((item) => normalizeAlarm(item)).filter((item): item is AlarmItem => Boolean(item)) : [],
        worldClocks: Array.isArray(parsed.worldClocks) && parsed.worldClocks.length > 0 ? parsed.worldClocks : fallback.worldClocks,
        preferences: { ...fallback.preferences, ...(parsed.preferences ?? {}) },
      };
    }

    // Migration from the previous package.
    const oldAlarms = JSON.parse(window.localStorage.getItem("ravin:clock:alarms") ?? "[]") as Partial<AlarmItem>[];
    const oldWorldClocks = JSON.parse(window.localStorage.getItem("ravin:clock:world-clocks") ?? "[]") as WorldClockItem[];
    fallback.alarms = oldAlarms.map((item) => normalizeAlarm(item)).filter((item): item is AlarmItem => Boolean(item));
    if (oldWorldClocks.length > 0) fallback.worldClocks = oldWorldClocks;
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveClockToolsState(state: ClockToolsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLOCK_TOOLS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable in restricted contexts.
  }
}

export function getSessionStorageKey(userId?: string) {
  return `${SESSION_STORAGE_PREFIX}:${userId ?? "current-user"}`;
}

export function loadPlatformSession(userId?: string): StoredPlatformSession {
  const fallback: StoredPlatformSession = {
    version: 2,
    todayKey: getTodayKey(),
    todayMs: 0,
    totalMs: 0,
    lastSeenAt: Date.now(),
    lastExitAt: null,
  };
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(getSessionStorageKey(userId)) ?? "null") as StoredPlatformSession | null;
    if (!parsed) return fallback;
    if (parsed.todayKey !== getTodayKey()) return { ...fallback, totalMs: Math.max(0, Number(parsed.totalMs) || 0), lastExitAt: parsed.lastExitAt ?? null };
    return {
      ...fallback,
      ...parsed,
      todayMs: Math.max(0, Number(parsed.todayMs) || 0),
      totalMs: Math.max(0, Number(parsed.totalMs) || 0),
    };
  } catch {
    return fallback;
  }
}

export function savePlatformSession(data: StoredPlatformSession, userId?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSessionStorageKey(userId), JSON.stringify(data));
  } catch {
    // Ignore unavailable storage.
  }
}

export function loadTabSession(userId?: string): TabSessionIdentity {
  const fallback: TabSessionIdentity = { id: createId(), enteredAt: Date.now(), activeMs: 0 };
  if (typeof window === "undefined") return fallback;
  const key = `${TAB_SESSION_PREFIX}:${userId ?? "current-user"}`;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as TabSessionIdentity | null;
    if (parsed?.id && Number.isFinite(parsed.enteredAt)) return { ...fallback, ...parsed, activeMs: Math.max(0, Number(parsed.activeMs) || 0) };
    window.sessionStorage.setItem(key, JSON.stringify(fallback));
  } catch {
    // Ignore unavailable sessionStorage.
  }
  return fallback;
}

export function saveTabSession(data: TabSessionIdentity, userId?: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${TAB_SESSION_PREFIX}:${userId ?? "current-user"}`, JSON.stringify(data));
  } catch {
    // Ignore unavailable sessionStorage.
  }
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
