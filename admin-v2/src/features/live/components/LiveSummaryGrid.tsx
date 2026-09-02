import {
  AlertTriangle,
  BookOpenCheck,
  Clock3,
  PauseCircle,
  Users,
  Wifi,
} from "lucide-react";
import type {
  LiveFilter,
  LiveSnapshot,
} from "../model/live.types";
import { SummaryCard } from "./SummaryCard";

export function LiveSummaryGrid({
  summary,
  filter,
  onFilterChange,
}: {
  summary:
    | NonNullable<
        LiveSnapshot["summary"]
      >
    | undefined;
  filter: LiveFilter;
  onFilterChange: (
    filter: LiveFilter,
  ) => void;
}) {
  return (
    <section className="grid shrink-0 grid-cols-3 gap-2 lg:grid-cols-6">
      <SummaryCard
        icon={Users}
        label="همه"
        value={summary?.total}
        active={filter === "all"}
        onClick={() =>
          onFilterChange("all")
        }
      />

      <SummaryCard
        icon={Wifi}
        label="آنلاین"
        value={summary?.online}
        tone="green"
        active={
          filter === "online"
        }
        onClick={() =>
          onFilterChange(
            "online",
          )
        }
      />

      <SummaryCard
        icon={BookOpenCheck}
        label="در حال مطالعه"
        value={summary?.studying}
        tone="blue"
        active={
          filter === "studying"
        }
        onClick={() =>
          onFilterChange(
            "studying",
          )
        }
      />

      <SummaryCard
        icon={PauseCircle}
        label="توقف"
        value={summary?.paused}
        tone="amber"
        active={
          filter === "paused"
        }
        onClick={() =>
          onFilterChange(
            "paused",
          )
        }
      />

      <SummaryCard
        icon={Clock3}
        label="در حال آزمون"
        value={
          summary?.takingExam
        }
        tone="blue"
        active={
          filter ===
          "taking_exam"
        }
        onClick={() =>
          onFilterChange(
            "taking_exam",
          )
        }
      />

      <SummaryCard
        icon={AlertTriangle}
        label="نیازمند توجه"
        value={
          summary?.attention
        }
        tone="red"
        active={
          filter ===
          "attention"
        }
        onClick={() =>
          onFilterChange(
            "attention",
          )
        }
      />
    </section>
  );
}
