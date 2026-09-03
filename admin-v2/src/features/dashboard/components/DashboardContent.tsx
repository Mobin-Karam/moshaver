import { AlertCircle, RefreshCw } from "lucide-react";
import { Button, EmptyState, LoadingState } from "../../../shared/ui/ui";
import type {
  AdminDashboardSummary,
  AttentionStudent,
  FollowUpMetric,
} from "../model/dashboard.types";
import { AttentionInbox } from "./AttentionInbox";
import { DashboardFollowUpCard } from "./DashboardFollowUpCard";
import { DashboardMetricCards } from "./DashboardMetricCards";
import { RecentReportsCard } from "./RecentReportsCard";

export function DashboardContent({
  summary,
  summaryLoading,
  summaryError,
  attention,
  attentionLoading,
  attentionError,
  followUp,
  refreshing,
  onRefresh,
  onRetrySummary,
  onRetryAttention,
}: {
  summary?: AdminDashboardSummary;
  summaryLoading: boolean;
  summaryError: boolean;
  attention: AttentionStudent[];
  attentionLoading: boolean;
  attentionError: boolean;
  followUp: FollowUpMetric[];
  refreshing: boolean;
  onRefresh: () => void;
  onRetrySummary: () => void;
  onRetryAttention: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-end gap-3">

        <Button className="h-9 px-3 text-xs" variant="soft" loading={refreshing} onClick={onRefresh}>
          <RefreshCw size={15} />
          بروزرسانی
        </Button>
      </div>

      {summaryLoading ? (
        <LoadingState label="در حال دریافت نمای کلی مدیریت…" />
      ) : summaryError || !summary ? (
        <EmptyState
          title="اطلاعات داشبورد مدیریت دریافت نشد."
          action={<Button variant="soft" onClick={onRetrySummary}><AlertCircle size={15} /> تلاش دوباره</Button>}
        />
      ) : (
        <DashboardMetricCards summary={summary} />
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AttentionInbox
          students={attention}
          loading={attentionLoading}
          error={attentionError}
          onRetry={onRetryAttention}
        />
        <DashboardFollowUpCard items={followUp} />
      </section>

      {summary ? <RecentReportsCard reports={summary.recentReports ?? []} /> : null}
    </div>
  );
}
