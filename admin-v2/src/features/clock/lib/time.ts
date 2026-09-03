export function pad2(value: number) {
  return String(Math.floor(Math.max(0, value))).padStart(2, "0");
}

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatCompactDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatStopwatchDuration(milliseconds: number) {
  const value = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((value % 1000) / 10);
  return hours > 0
    ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(hundredths)}`
    : `${pad2(minutes)}:${pad2(seconds)}.${pad2(hundredths)}`;
}

export function formatClockTime(date: Date, hour12 = false, timeZone?: string) {
  return new Intl.DateTimeFormat(hour12 ? "en-US" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12,
    timeZone,
  }).format(date);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(timestamp?: number | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function getTodayKey(date = new Date()) {
  return [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-");
}

export function getAlarmMinuteKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

export function getStopwatchElapsed(
  stopwatch: { running: boolean; accumulatedMs: number; startedAt: number | null },
  now = Date.now(),
) {
  if (!stopwatch.running || stopwatch.startedAt == null) return stopwatch.accumulatedMs;
  return stopwatch.accumulatedMs + Math.max(0, now - stopwatch.startedAt);
}

export function getTimerRemaining(
  timer: { status: string; targetAt: number | null; remainingMs: number },
  now = Date.now(),
) {
  if (timer.status !== "running" || timer.targetAt == null) return Math.max(0, timer.remainingMs);
  return Math.max(0, timer.targetAt - now);
}

export function getDayOffsetLabel(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const remote = Date.UTC(read("year"), read("month") - 1, read("day"));
  const local = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((remote - local) / 86_400_000);
  if (diff === 0) return "امروز";
  if (diff === 1) return "فردا";
  if (diff === -1) return "دیروز";
  return diff > 0 ? `${diff}+ روز` : `${Math.abs(diff)}- روز`;
}

export function getNextAlarmTimestamp(
  alarm: { hour: number; minute: number; enabled: boolean; repeatDays: number[]; snoozedUntil: number | null },
  now = Date.now(),
) {
  if (!alarm.enabled) return null;
  if (alarm.snoozedUntil && alarm.snoozedUntil > now) return alarm.snoozedUntil;

  const base = new Date(now);
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() + offset);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);
    if (candidate.getTime() <= now) continue;
    if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(candidate.getDay())) continue;
    return candidate.getTime();
  }
  return null;
}
