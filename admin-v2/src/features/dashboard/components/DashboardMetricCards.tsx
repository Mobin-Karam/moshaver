import { Card } from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import type {
  DashboardMetrics,
  DashboardOverview,
} from "../model/dashboard.types";

export function DashboardMetricCards({
  metrics,
  health,
  inboxCount,
}: {
  metrics: DashboardMetrics;
  health: DashboardOverview["health"];
  inboxCount: number;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-4">
      <Card>
        <span className="text-sm text-slate-500">
          اجرای امروز
        </span>

        <strong className="mt-2 block text-2xl">
          {fa(
            (metrics.doneTasks || 0) +
              (metrics.partialTasks || 0),
          )}
          /{fa(metrics.totalTasks || 0)}
        </strong>

        <small>
          {fa(metrics.actualMinutes || 0)} دقیقه
        </small>
      </Card>

      <Card>
        <span className="text-sm text-slate-500">
          سلامت
        </span>

        <strong className="mt-2 block text-2xl">
          {fa(health || 82)}%
        </strong>

        <small>
          بر اساس تکمیل، آزمون و هشدارها
        </small>
      </Card>

      <Card>
        <span className="text-sm text-slate-500">
          تست امروز
        </span>

        <strong className="mt-2 block text-2xl">
          {fa(metrics.actualTests || 0)}
        </strong>

        <small>
          هدف {fa(metrics.plannedTests || 0)}
        </small>
      </Card>

      <Card>
        <span className="text-sm text-slate-500">
          موارد توجه
        </span>

        <strong className="mt-2 block text-2xl">
          {fa(inboxCount)}
        </strong>

        <small>
          پیام، ریکاوری، ریسک آزمون
        </small>
      </Card>
    </section>
  );
}
