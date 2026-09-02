import type { Plan, PlanTask } from "../../../shared/types/domain";
import { addDays, normalizePersianText } from "../../../shared/lib/utils";
import type { PlannerMode, TaskDraft, TaskFilter } from "../model/planner.types";

export function plannerRange(date: string, mode: PlannerMode, locale = "en", calendar = "gregory") {
  if (mode === "day") return { from: date, to: date };
  const d = new Date(`${date}T12:00:00`);
  if (mode === "week") {
    const offset = (d.getDay() + 1) % 7;
    const from = iso(addDateDays(d, -offset));
    return { from, to: addDays(from, 6) };
  }
  if (mode === "month") return calendarMonthRange(date, locale, calendar);
  return { from: addDays(date, -30), to: addDays(date, 30) };
}

export function shiftView(date: string, mode: PlannerMode, direction: number, locale = "en", calendar = "gregory") {
  const d = new Date(`${date}T12:00:00`);
  if (mode === "month" && calendar !== "gregory") {
    const current = calendarParts(date, locale, calendar);
    let next = date;
    for (let count = 0; count < 40; count++) {
      next = addDays(next, direction);
      const part = calendarParts(next, locale, calendar);
      if (part.month !== current.month || part.year !== current.year) return next;
    }
    return next;
  }
  if (mode === "month") d.setMonth(d.getMonth() + direction);
  else d.setDate(d.getDate() + direction * (mode === "week" ? 7 : mode === "list" ? 30 : 1));
  return iso(d);
}

export function dateRange(from: string, to: string) {
  const out: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) out.push(day);
  return out;
}

export function monthCells(from: string, to: string) {
  const offset = (new Date(`${from}T12:00:00`).getDay() + 1) % 7;
  return [...Array<string | null>(offset).fill(null), ...dateRange(from, to)];
}

export function taskMinutes(task: PlanTask) {
  const [sh, sm] = (task.start || "00:00").split(":").map(Number);
  const [eh, em] = (task.end || "00:00").split(":").map(Number);
  return Math.max(0, eh * 60 + em - sh * 60 - sm);
}

export function summarizePlans(plans: Plan[]) {
  return plans.reduce((acc, plan) => {
    plan.tasks.forEach((task) => {
      acc.tasks++;
      acc.minutes += taskMinutes(task);
      acc.tests += Number(task.testCount || 0);
    });
    return acc;
  }, { tasks: 0, minutes: 0, tests: 0 });
}

export function planWarnings(plans: Plan[]) {
  const warnings: string[] = [];
  plans.forEach((plan) => {
    let total = 0;
    plan.tasks.forEach((task, index) => {
      total += taskMinutes(task);
      if ((task.end || "") > "22:30") warnings.push(`${plan.planDate}: فعالیت دیرهنگام تا ${task.end}`);
      plan.tasks.slice(index + 1).forEach((other) => {
        if ((task.start || "") < (other.end || "") && (other.start || "") < (task.end || "")) {
          warnings.push(`${plan.planDate}: تداخل ${task.start} و ${other.start}`);
        }
      });
    });
    if (total > 480) warnings.push(`${plan.planDate}: حجم برنامه بیش از ۸ ساعت است`);
  });
  return warnings;
}

export function parseMode(value: string | null): PlannerMode {
  return value === "day" || value === "month" || value === "list" ? value : "week";
}
export function parseFilter(value: string | null): TaskFilter {
  return value === "published" || value === "draft" || value === "incomplete" ? value : "all";
}
export function filterLabel(value: TaskFilter) {
  return ({ all: "همه برنامه‌ها", published: "فقط منتشرشده", draft: "فقط پیش‌نویس", incomplete: "فعالیت‌های انجام‌نشده" } as const)[value];
}

export function filterPlans(plans: Plan[], search: string, filter: TaskFilter) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  return plans
    .filter((plan) => filter === "all" || (filter === "published" && plan.published) || (filter === "draft" && !plan.published) || (filter === "incomplete" && plan.tasks.some((task) => !task.completedAt)))
    .map((plan) => ({
      ...plan,
      tasks: plan.tasks
        .filter((task) => filter !== "incomplete" || !isTaskComplete(task))
        .filter((task) => !needle || normalizePersianText([task.title, task.subject, task.note, task.type, task.pages].filter(Boolean).join(" ")).toLocaleLowerCase("fa").includes(needle))
        .sort(comparePlanTasks),
    }))
    .filter((plan) => !needle || plan.tasks.length > 0);
}

export function replacePlan(current: Plan[] | undefined, updated: Plan) {
  updated = { ...updated, tasks: [...updated.tasks].sort(comparePlanTasks) };
  if (!current) return [updated];
  const found = current.some((plan) => plan.id === updated.id);
  return found ? current.map((plan) => plan.id === updated.id ? updated : plan) : [...current, updated].sort((a, b) => a.planDate.localeCompare(b.planDate));
}

export function optimisticMove(plans: Plan[], move: { taskId: string; planId: string; start: string; end: string }) {
  let moved: PlanTask | undefined;
  const stripped = plans.map((plan) => ({
    ...plan,
    tasks: plan.tasks.filter((task) => {
      if (task.id === move.taskId) {
        moved = { ...task, start: move.start, end: move.end, sortOrder: timeToMinutes(move.start) };
        return false;
      }
      return true;
    }),
  }));
  if (!moved) return plans;
  return stripped.map((plan) => plan.id === move.planId ? { ...plan, tasks: [...plan.tasks, moved!].sort(comparePlanTasks) } : plan);
}

export function comparePlanTasks(a: PlanTask, b: PlanTask) {
  return taskTime(a).localeCompare(taskTime(b)) || (a.end || a.endTime || "").localeCompare(b.end || b.endTime || "") || a.id.localeCompare(b.id);
}
export function sortPlanTasks(plans: Plan[]) {
  return plans.map((plan) => ({ ...plan, tasks: [...plan.tasks].sort(comparePlanTasks) }));
}
export function taskTime(task: PlanTask) { return task.start || task.startTime || "99:99"; }
export function normalizeTaskDraft<T extends TaskDraft & { id?: string }>(task: T): T {
  return { ...task, start: normalizeTime(task.start), end: normalizeTime(task.end), sortOrder: timeToMinutes(task.start) };
}
export function normalizeTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return `${String(Number(hour)).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")}`;
}
export function timeToMinutes(value: string) {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
}
export function validateTaskDraft(task: Pick<TaskDraft, "start" | "end">) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.end)) return "زمان شروع و پایان معتبر وارد کنید.";
  if (timeToMinutes(task.end) <= timeToMinutes(task.start)) return "زمان پایان باید بعد از زمان شروع باشد.";
  return "";
}
export function parseDraggedTask(raw: string) {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value.id !== "string" || typeof value.start !== "string" || typeof value.end !== "string" || validateTaskDraft({ start: value.start, end: value.end })) return null;
    return { id: value.id, start: value.start, end: value.end };
  } catch { return null; }
}
export function taskTypeLabel(type: string) {
  return ({ study: "مطالعه", review: "مرور", test: "تست", class: "کلاس", prayer: "نماز", meal: "وعده غذایی", break: "استراحت", exam: "آزمون" } as Record<string, string>)[type] || type;
}
export function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error && reason.message ? reason.message : fallback; }
export function isTaskComplete(task: PlanTask) { return Boolean(task.completedAt || task.completion?.status === "done"); }
export function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function minutesBetween(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function addDateDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function calendarParts(value: string, locale: string, calendar: string) {
  const parts = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}-nu-latn`, { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(`${value}T12:00:00`));
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: number("year"), month: number("month"), day: number("day") };
}
function calendarMonthRange(date: string, locale: string, calendar: string) {
  const selected = calendarParts(date, locale, calendar);
  let from = date;
  while (calendarParts(from, locale, calendar).day !== 1) from = addDays(from, -1);
  let to = from;
  for (let count = 0; count < 32; count++) {
    const next = addDays(to, 1);
    const part = calendarParts(next, locale, calendar);
    if (part.month !== selected.month || part.year !== selected.year) break;
    to = next;
  }
  return { from, to };
}
