import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  digitsArToFa,
  digitsEnToFa,
  digitsFaToEn,
  toPersianChars,
} from "@persian-tools/persian-tools";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fa(value: unknown) {
  return digitsArToFa(digitsEnToFa(String(value ?? "")));
}

export function normalizePersianText(value: unknown) {
  return toPersianChars(digitsArToFa(digitsEnToFa(String(value ?? ""))));
}

export function englishDigits(value: unknown) {
  return digitsFaToEn(String(value ?? ""));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
