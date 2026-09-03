import { useEffect, useState } from "react";

function readBoolean(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function readStoredList(key: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [] as string[];
  }
}

export function writeStoredList(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the UI functional even when storage writes fail.
  }
}

export function usePersistentCollapse(key: string, fallback = false) {
  const [collapsed, setCollapsed] = useState(() => readBoolean(key, fallback));

  useEffect(() => {
    writeBoolean(key, collapsed);
  }, [collapsed, key]);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === key) setCollapsed(event.newValue === "1");
    }

    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  return [collapsed, setCollapsed] as const;
}
