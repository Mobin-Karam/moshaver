import {
  Activity,
} from "lucide-react";
import { fa } from "../../../shared/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import type {
  LiveEvent,
  LivePanel,
} from "../model/live.types";
import { CompactSkeleton } from "./CompactSkeleton";
import { TimelineItem } from "./TimelineItem";

export function TimelinePanel({
  panel,
  loading,
  events,
  formatDateTime,
}: {
  panel: LivePanel;
  loading: boolean;
  events: LiveEvent[];
  formatDateTime: (
    value?: string | Date,
  ) => string;
}) {
  return (
    <Card
      className={[
        panel === "students"
          ? "hidden lg:flex"
          : "flex",
        "min-h-0 flex-col overflow-hidden p-0",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-2">
          <Activity
            size={17}
            className="text-brand"
          />

          <strong>
            رویدادهای اخیر
          </strong>
        </span>

        <Badge>
          {fa(events.length)}
        </Badge>
      </div>

      {events.length ? (
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
          {events.map(
            (event) => (
              <TimelineItem
                key={event.id}
                event={event}
                formatDateTime={
                  formatDateTime
                }
              />
            ),
          )}
        </div>
      ) : !loading ? (
        <EmptyState title="هنوز رویدادی ثبت نشده است." />
      ) : (
        <CompactSkeleton />
      )}
    </Card>
  );
}
