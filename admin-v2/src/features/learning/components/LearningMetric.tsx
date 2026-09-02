import type {
  LucideIcon,
} from "lucide-react";
import { Card } from "../../../shared/ui/ui";

export function LearningMetric({
  icon: Icon,
  label,
  value = 0,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value?: string | number;
  tone?:
    | "blue"
    | "red"
    | "amber"
    | "green";
}) {
  const colors = {
    blue:
      "bg-sky-50 text-sky-700",
    red:
      "bg-rose-50 text-rose-700",
    amber:
      "bg-amber-50 text-amber-700",
    green:
      "bg-emerald-50 text-emerald-700",
  };

  return (
    <Card className="flex items-center gap-3 p-3">
      <span
        className={`grid size-9 place-items-center rounded-full ${colors[tone]}`}
      >
        <Icon size={17} />
      </span>

      <div>
        <span className="block text-[11px] text-slate-500">
          {label}
        </span>

        <strong>
          {typeof value ===
          "number"
            ? value.toLocaleString(
                "fa-IR",
              )
            : value}
        </strong>
      </div>
    </Card>
  );
}
