import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { addDays, cn, todayIso } from "../lib/utils";
import { useLocale } from "./locale";
import { ViewportPopover } from "./popover";

type DatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
};

export function DatePicker({
  value,
  onChange,
  disabled,
  required,
  className,
  min = "",
  max = "",
}: DatePickerProps) {
  const { profile, formatDate } = useLocale();
  const [open, setOpen] = useState(false),
    [cursor, setCursor] = useState(value || todayIso());
  useEffect(() => {
    if (value) setCursor(value);
  }, [value]);
  const grid = useMemo(
    () => calendarGrid(cursor, profile.locale, profile.calendar),
    [cursor, profile],
  );
  return (
    <div className={cn("relative", className)}>
      <ViewportPopover open={open} onOpenChange={setOpen} width={300} className="p-3" trigger={(props) => <button
        {...props}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
      >
        <span>{value ? formatDate(value) : "انتخاب تاریخ"}</span>
        <CalendarDays size={16} className="text-slate-400" />
      </button>}>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="rounded p-2 hover:bg-slate-100"
              onClick={() =>
                setCursor(
                  shiftCalendarMonth(
                    cursor,
                    -1,
                    profile.locale,
                    profile.calendar,
                  ),
                )
              }
            >
              <ChevronRight size={17} />
            </button>
            <strong className="text-sm">
              {formatDate(cursor, {
                day: undefined,
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              type="button"
              className="rounded p-2 hover:bg-slate-100"
              onClick={() =>
                setCursor(
                  shiftCalendarMonth(
                    cursor,
                    1,
                    profile.locale,
                    profile.calendar,
                  ),
                )
              }
            >
              <ChevronLeft size={17} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
            {weekdayLabels(profile.locale, profile.calendar).map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((day, index) =>
              day ? (
                <button
                  type="button"
                  key={day.iso}
                  disabled={Boolean(
                    (min && day.iso < min) || (max && day.iso > max),
                  )}
                  onClick={() => {
                    onChange(day.iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "aspect-square rounded-md text-sm hover:bg-indigo-50 disabled:opacity-30",
                    day.iso === value && "bg-brand text-white hover:bg-brand",
                    day.iso === todayIso() &&
                      day.iso !== value &&
                      "ring-1 ring-brand",
                  )}
                >
                  {localNumber(day.day, profile.locale)}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              ),
            )}
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-md py-2 text-sm font-semibold text-brand hover:bg-indigo-50"
            onClick={() => {
              onChange(todayIso());
              setCursor(todayIso());
              setOpen(false);
            }}
          >
            امروز
          </button>
        </div>
      </ViewportPopover>
      {required ? <input className="sr-only" required value={value} onChange={() => undefined} /> : null}
    </div>
  );
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const date = value?.slice(0, 10) || todayIso(),
    time = value?.slice(11, 16) || "08:00";
  const offset = value?.match(/([+-]\d\d:\d\d|Z)$/)?.[1] || "+03:30";
  return (
    <div className="grid grid-cols-[1fr_105px] gap-2">
      <DatePicker
        value={date}
        disabled={disabled}
        onChange={(next) => onChange(`${next}T${time}:00${offset}`)}
      />
      <input
        type="time"
        disabled={disabled}
        value={time}
        onChange={(event) =>
          onChange(`${date}T${event.target.value}:00${offset}`)
        }
        className="h-10 rounded-md border border-slate-200 px-2 text-sm"
      />
    </div>
  );
}

function calendarParts(iso: string, locale: string, calendar: string) {
  const parts = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}-nu-latn`, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(`${iso}T12:00:00`));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
function calendarGrid(cursor: string, locale: string, calendar: string) {
  const current = calendarParts(cursor, locale, calendar);
  let first = cursor;
  while (calendarParts(first, locale, calendar).day !== 1)
    first = addDays(first, -1);
  const offset =
    (new Date(`${first}T12:00:00`).getDay() +
      (locale.startsWith("fa") ? 1 : 0)) %
    7;
  const rows: Array<{ iso: string; day: number } | null> =
    Array(offset).fill(null);
  for (let iso = first; ; iso = addDays(iso, 1)) {
    const part = calendarParts(iso, locale, calendar);
    if (part.month !== current.month || part.year !== current.year) break;
    rows.push({ iso, day: part.day });
  }
  return rows;
}
function shiftCalendarMonth(
  cursor: string,
  delta: number,
  locale: string,
  calendar: string,
) {
  const current = calendarParts(cursor, locale, calendar);
  let probe = cursor;
  for (let count = 0; count < 40; count++) {
    probe = addDays(probe, delta);
    const next = calendarParts(probe, locale, calendar);
    if (next.month !== current.month || next.year !== current.year)
      return probe;
  }
  return probe;
}
function weekdayLabels(locale: string, calendar: string) {
  const base = locale.startsWith("fa")
    ? new Date("2024-01-06T12:00:00")
    : new Date("2024-01-07T12:00:00");
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
      weekday: "narrow",
    }).format(new Date(base.getTime() + index * 86400000)),
  );
}
function localNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { useGrouping: false }).format(value);
}
