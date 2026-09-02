export type DashboardOverview = {
  health?: number;
  todayMetrics?: {
    doneTasks?: number;
    partialTasks?: number;
    totalTasks?: number;
    actualMinutes?: number;
    actualTests?: number;
    plannedTests?: number;
  };
};

export type AdvisorInbox = {
  issues?: unknown[];
  recoveryRequests?: unknown[];
  reviews?: unknown[];
  missedTasks?: unknown[];
  examRetryRequests?: unknown[];
};

export type DashboardMetrics =
  NonNullable<DashboardOverview["todayMetrics"]>;

export type AttentionItem = {
  key:
    | "issues"
    | "recoveryRequests"
    | "reviews"
    | "missedTasks"
    | "unread";
  label: string;
  count: number;
};
