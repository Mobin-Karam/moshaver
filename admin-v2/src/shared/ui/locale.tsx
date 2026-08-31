import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type LocationId = "iran" | "afghanistan" | "international";
export type LocationProfile = {
  id: LocationId;
  label: string;
  locale: string;
  calendar: "persian" | "gregory";
  timeZone: string;
  direction: "rtl" | "ltr";
};

export const locations: LocationProfile[] = [
  {
    id: "iran",
    label: "ایران",
    locale: "fa-IR",
    calendar: "persian",
    timeZone: "Asia/Tehran",
    direction: "rtl",
  },
  {
    id: "afghanistan",
    label: "افغانستان",
    locale: "fa-AF",
    calendar: "persian",
    timeZone: "Asia/Kabul",
    direction: "rtl",
  },
  {
    id: "international",
    label: "بین‌المللی",
    locale: "en-US",
    calendar: "gregory",
    timeZone: "UTC",
    direction: "ltr",
  },
];

const key = "moshaver-admin-location";
const LocaleContext = createContext<{
  profile: LocationProfile;
  setLocation: (id: LocationId) => void;
  formatDate: (
    value?: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatDateTime: (value?: string | Date) => string;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<LocationId>(
    () => (localStorage.getItem(key) as LocationId) || "iran",
  );
  const profile =
    locations.find((item) => item.id === location) || locations[0];
  useEffect(() => {
    document.documentElement.lang = profile.locale;
    document.documentElement.dir = profile.direction;
  }, [profile]);
  const value = useMemo(
    () => ({
      profile,
      setLocation(id: LocationId) {
        localStorage.setItem(key, id);
        setLocationState(id);
      },
      formatDate(
        value?: string | Date,
        options: Intl.DateTimeFormatOptions = {},
      ) {
        if (!value) return "";
        return new Intl.DateTimeFormat(
          `${profile.locale}-u-ca-${profile.calendar}`,
          {
            timeZone: profile.timeZone,
            year: "numeric",
            month: "long",
            day: "numeric",
            ...options,
          },
        ).format(toDate(value));
      },
      formatDateTime(value?: string | Date) {
        if (!value) return "";
        return new Intl.DateTimeFormat(
          `${profile.locale}-u-ca-${profile.calendar}`,
          {
            timeZone: profile.timeZone,
            dateStyle: "medium",
            timeStyle: "short",
          },
        ).format(toDate(value));
      },
    }),
    [profile],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

function toDate(value: string | Date) {
  return value instanceof Date
    ? value
    : new Date(value.length === 10 ? `${value}T12:00:00` : value);
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
