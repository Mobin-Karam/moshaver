import {
  useEffect,
  useState,
} from "react";

function readValue(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "1";
  } catch {
    return fallback;
  }
}

export function useStoredBoolean(
  key: string,
  fallback: boolean,
) {
  const [value, setValue] = useState(() => readValue(key, fallback));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }
  }, [key, value]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }

      setValue(event.newValue === null ? fallback : event.newValue === "1");
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fallback, key]);

  return [value, setValue] as const;
}
