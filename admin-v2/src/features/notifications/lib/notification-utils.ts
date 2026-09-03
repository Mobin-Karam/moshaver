import type {
  AdvisorInbox,
  AdvisorInboxRow,
  TaskIssue,
} from "../model/notification.types";

function itemKey(prefix: string, value: Record<string, unknown>, index: number) {
  return `${prefix}:${String(value.id || value.taskId || value.task_id || index)}`;
}

export function buildAdvisorInboxRows(inbox?: AdvisorInbox): AdvisorInboxRow[] {
  return [
    ...(inbox?.issues ?? []).map((value, index) => ({
      key: itemKey("issue", value as Record<string, unknown>, index),
      kind: "issue" as const,
      type: "مشکل فعالیت",
      value,
      tone: "red" as const,
      actionable: true as const,
    })),
    ...(inbox?.recoveryRequests ?? []).map((value, index) => ({
      key: itemKey("recovery", value as Record<string, unknown>, index),
      kind: "recovery" as const,
      type: "درخواست ریکاوری",
      value,
      tone: "blue" as const,
      actionable: true as const,
    })),
    ...(inbox?.missedTasks ?? []).map((value, index) => ({
      key: itemKey("missed", value as unknown as Record<string, unknown>, index),
      kind: "missed" as const,
      type: "فعالیت انجام‌نشده",
      value,
      tone: "red" as const,
      actionable: false as const,
    })),
    ...(inbox?.reviews ?? []).map((value, index) => ({
      key: itemKey("review", value, index),
      kind: "review" as const,
      type: "مرور عقب‌افتاده",
      value,
      tone: "amber" as const,
      actionable: false as const,
    })),
    ...(inbox?.examRetryRequests ?? []).map((value, index) => ({
      key: itemKey("exam-retry", value, index),
      kind: "examRetry" as const,
      type: "درخواست تلاش مجدد",
      value,
      tone: "amber" as const,
      actionable: false as const,
    })),
  ];
}

export function issueTypeLabel(issue: TaskIssue) {
  const value = issue.issueType || issue.issue_type || "other";
  const labels: Record<string, string> = {
    hard: "فعالیت دشوار",
    unclear: "ابهام در فعالیت",
    time: "کمبود زمان",
    resource: "مشکل منبع",
    other: "سایر",
  };
  return labels[value] || value;
}

export function inboxCreatedAt(value: Record<string, unknown>) {
  return String(value.createdAt || value.created_at || "");
}
