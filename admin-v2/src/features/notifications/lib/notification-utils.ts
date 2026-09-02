import type {
  AdvisorInbox,
  AdvisorInboxRow,
} from "../model/notification.types";

export function buildAdvisorInboxRows(
  inbox?: AdvisorInbox,
): AdvisorInboxRow[] {
  return [
    ...(inbox?.missedTasks ?? []).map(
      (value) => ({
        type:
          "فعالیت انجام‌نشده",
        value,
        tone: "red" as const,
      }),
    ),

    ...(inbox?.reviews ?? []).map(
      (value) => ({
        type: "مرور",
        value,
        tone: "amber" as const,
      }),
    ),

    ...(
      inbox?.recoveryRequests ??
      []
    ).map((value) => ({
      type:
        "درخواست ریکاوری",
      value,
      tone: "blue" as const,
    })),

    ...(
      inbox?.examRetryRequests ??
      []
    ).map((value) => ({
      type: "تلاش مجدد",
      value,
      tone: "amber" as const,
    })),

    ...(inbox?.issues ?? []).map(
      (value) => ({
        type: "هشدار",
        value,
        tone: "red" as const,
      }),
    ),
  ];
}

export function summarizeAdvisorInboxValue(
  value: unknown,
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return String(
      value || "",
    );
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  return String(
    row.title ||
      row.subject ||
      row.reason ||
      row.message ||
      row.createdAt ||
      row.created_at ||
      "جزئیات در داشبورد دانش‌آموز",
  );
}
