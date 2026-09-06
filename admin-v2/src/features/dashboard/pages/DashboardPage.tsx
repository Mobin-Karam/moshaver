import { RoleDashboard } from "../components/RoleDashboard";
import { useDashboardData } from "../hooks/useDashboardData";

export function DashboardPage() {
  const dashboard = useDashboardData();

  return (
    <RoleDashboard
      data={dashboard.summary.data}
      loading={dashboard.summary.isLoading}
      error={dashboard.summary.isError}
      attention={dashboard.attentionStudents}
      attentionLoading={dashboard.attention.isLoading}
      attentionError={dashboard.attention.isError}
      refreshing={dashboard.refreshing}
      onRefresh={() => void dashboard.refresh()}
      onRetry={() => void dashboard.summary.refetch()}
      onRetryAttention={() => void dashboard.attention.refetch()}
    />
  );
}
