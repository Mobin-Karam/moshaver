import {
  Activity,
} from "lucide-react";
import {
  activityLabel,
  activityMeta,
} from "../lib/live-helpers";
import type { LiveEvent } from "../model/live.types";

export function TimelineItem({
  event,
  formatDateTime,
}: {
  event: LiveEvent;
  formatDateTime: (
    value?: string | Date,
  ) => string;
}) {
  return (
    <article className="flex gap-3 p-4 hover:bg-slate-50">
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-brand">
        <Activity size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <strong className="text-sm">
          {event.studentName} —{" "}
          {activityLabel(
            event.eventType,
          )}
        </strong>

        <p className="mt-1 truncate text-xs text-slate-500">
          {activityMeta(event)}
        </p>
      </div>

      <time className="shrink-0 text-[11px] text-slate-400">
        {formatDateTime(
          event.createdAt,
        )}
      </time>
    </article>
  );
}
