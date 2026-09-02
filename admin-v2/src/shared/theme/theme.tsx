import { Monitor, Moon, Sun } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "admin-theme-preference";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

const themeOptions = [
  { value: "light", label: "روشن", icon: Sun },
  { value: "dark", label: "تیره", icon: Moon },
  { value: "system", label: "سیستم", icon: Monitor },
] as const;

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function storedPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function initializeTheme() {
  if (typeof window !== "undefined") applyTheme(storedPreference());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(storedPreference);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(preference));

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_QUERY);
    const sync = () => setResolvedTheme(applyTheme(preference));
    sync();
    if (preference === "system") media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preference]);

  const setPreference = (next: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
  };

  return <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="flex h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5" role="group" aria-label="حالت نمایش">
      {themeOptions.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            className={`grid size-8 place-items-center rounded-md transition ${selected ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-ink"}`}
            title={`حالت ${label}`}
            aria-label={`حالت ${label}`}
            aria-pressed={selected}
            onClick={() => setPreference(value)}
          >
            <Icon size={16} strokeWidth={selected ? 2.4 : 1.9} />
          </button>
        );
      })}
    </div>
  );
}
