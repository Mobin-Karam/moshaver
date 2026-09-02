import {
  AlertTriangle,
} from "lucide-react";
import {
  Badge,
} from "../../../shared/ui/ui";
import {
  elapsed,
  needsAttention,
  stateLabel,
  stateTone,
} from "../lib/live-helpers";
import type { LiveStudent } from "../model/live.types";

export function StudentRow({
  student,
  active,
  now,
  onClick,
}: {
  student: LiveStudent;
  active: boolean;
  now: number;
  onClick: () => void;
}) {
  const attention =
    needsAttention(student);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        contentVisibility:
          "auto",
        containIntrinsicSize:
          "72px",
      }}
      className={[
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-right transition hover:bg-slate-50",
        active
          ? "bg-indigo-50"
          : "",
      ].join(" ")}
    >
      <span className="relative grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-black text-brand">
        {student.name.slice(
          0,
          1,
        )}

        <i
          className={[
            "absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-white",
            student.presence?.online
              ? "bg-emerald-500"
              : "bg-slate-400",
          ].join(" ")}
        />
      </span>

      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <strong className="truncate text-sm">
            {student.name}
          </strong>

          {attention ? (
            <AlertTriangle
              size={14}
              className="shrink-0 text-amber-600"
            />
          ) : null}
        </span>

        <small className="block truncate text-slate-500">
          {student.activeSession
            ?.title ||
            student.currentView ||
            [
              student.grade,
              student.major,
            ]
              .filter(Boolean)
              .join(" • ") ||
            "بدون فعالیت جاری"}
        </small>
      </span>

      <span className="text-left">
        <Badge
          tone={stateTone(
            student.state,
          )}
        >
          {stateLabel(
            student.state,
          )}
        </Badge>

        {student.activeSession
          ?.startedAt ? (
          <small
            className="mt-1 block font-mono text-[10px] text-brand"
            dir="ltr"
          >
            {elapsed(
              now,
              student
                .activeSession
                .startedAt,
            )}
          </small>
        ) : null}
      </span>
    </button>
  );
}
