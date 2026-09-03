import { DashboardContent } from "../components/DashboardContent";
import { useDashboardData } from "../hooks/useDashboardData";

export function DashboardPage() {
  const dashboard = useDashboardData();

  return (
    <DashboardContent
      summary={dashboard.summary.data}
      summaryLoading={dashboard.summary.isLoading}
      summaryError={dashboard.summary.isError}
      attention={dashboard.attentionStudents}
      attentionLoading={dashboard.attention.isLoading}
      attentionError={dashboard.attention.isError}
      followUp={dashboard.followUp}
      refreshing={dashboard.refreshing}
      onRefresh={() => void dashboard.refresh()}
      onRetrySummary={() => void dashboard.summary.refetch()}
      onRetryAttention={() => void dashboard.attention.refetch()}
    />
  );
}
