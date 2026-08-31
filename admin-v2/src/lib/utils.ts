import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fa(value: unknown) {
  return String(value ?? "").replace(
    /[0-9]/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit,
  );
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
