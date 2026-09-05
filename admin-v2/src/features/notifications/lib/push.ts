import type { PushPreferences } from "../model/notification-model";

export const defaultPushPreferences: PushPreferences = {
  lessons: true,
  messages: true,
  exams: true,
  announcements: true,
};

export function supportsPush() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function vapidBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Uint8Array.from(
    atob(padded),
    (character) => character.charCodeAt(0),
  );
}
