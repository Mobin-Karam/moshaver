import type {
  LucideIcon,
} from "lucide-react";
import { fa } from "../../../shared/lib/utils";

export function SummaryCard({
  icon: Icon,
  label,
  value = 0,
  tone = "neutral",
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  tone?:
    | "neutral"
    | "green"
    | "amber"
    | "red"
    | "blue";
  active: boolean;
  onClick: () => void;
}) {
  const color = {
    neutral:
      "text-slate-600",
    green:
      "text-emerald-600",
    amber:
      "text-amber-600",
    red:
      "text-rose-600",
    blue:
      "text-sky-600",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "flex min-w-0 items-center gap-2 rounded-lg border bg-white px-2 py-2 text-right shadow-sm transition hover:border-brand",
        active
          ? "border-brand ring-2 ring-indigo-100"
          : "border-slate-200",
      ].join(" ")}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-md bg-slate-50 ${color}`}
      >
        <Icon size={16} />
      </span>

      <span className="min-w-0">
        <strong className="block text-base leading-5">
          {fa(value)}
        </strong>

        <small className="block truncate text-[10px] text-slate-500">
          {label}
        </small>
      </span>
    </button>
  );
}
