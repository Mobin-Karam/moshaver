import { todayIso } from "../../../shared/lib/utils";

export function isValidIsoDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime());
}

export function safeIsoDate(value?: string) {
  return isValidIsoDate(value) ? value! : todayIso();
}
