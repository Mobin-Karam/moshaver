import { LoadingState } from "../../../shared/ui/ui";
import type {
  AttentionItem,
  DashboardMetrics,
  DashboardOverview,
} from "../model/dashboard.types";
import { AttentionInbox } from "./AttentionInbox";
import { DashboardMetricCards } from "./DashboardMetricCards";
import { TodayActivityCard } from "./TodayActivityCard";

export function DashboardContent({
  overviewLoading,
  metrics,
  health,
  inboxCount,
  attentionItems,
}: {
  overviewLoading: boolean;
  metrics: DashboardMetrics;
  health: DashboardOverview["health"];
  inboxCount: number;
  attentionItems: AttentionItem[];
}) {
  return (
    <>
      {overviewLoading ? (
        <LoadingState />
      ) : (
        <DashboardMetricCards
          metrics={metrics}
          health={health}
          inboxCount={inboxCount}
        />
      )}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <AttentionInbox
          count={inboxCount}
          items={attentionItems}
        />

        <TodayActivityCard />
      </section>
    </>
  );
}
