import {
  useEffect,
  useState,
} from "react";

export function useStoredBoolean(
  key: string,
  fallback: boolean,
) {
  const [value, setValue] =
    useState(() =>
      localStorage.getItem(
        key,
      ) === null
        ? fallback
        : localStorage.getItem(
            key,
          ) === "1",
    );

  useEffect(() => {
    localStorage.setItem(
      key,
      value ? "1" : "0",
    );
  }, [key, value]);

  return [
    value,
    setValue,
  ] as const;
}
