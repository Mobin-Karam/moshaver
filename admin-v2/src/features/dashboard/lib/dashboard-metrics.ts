import type { Conversation } from "../../../shared/types/domain";
import type {
  AdvisorInbox,
  AttentionItem,
} from "../model/dashboard.types";

const inboxKeys: Array<keyof AdvisorInbox> = [
  "issues",
  "recoveryRequests",
  "reviews",
  "missedTasks",
  "examRetryRequests",
];

export function getUnreadConversationCount(
  conversations: Conversation[],
  studentId: string,
) {
  return conversations
    .filter(
      (conversation) =>
        conversation.student?.id === studentId,
    )
    .reduce(
      (sum, conversation) =>
        sum + Number(conversation.unread || 0),
      0,
    );
}

export function getInboxCount(
  inbox: AdvisorInbox | undefined,
  unread: number,
) {
  return inboxKeys.reduce(
    (sum, key) =>
      sum + (inbox?.[key]?.length || 0),
    unread,
  );
}

export function getAttentionItems(
  inbox: AdvisorInbox | undefined,
  unread: number,
): AttentionItem[] {
  return [
    {
      key: "issues",
      label: "گزارش مشکل",
      count: inbox?.issues?.length || 0,
    },
    {
      key: "recoveryRequests",
      label: "ریکاوری",
      count:
        inbox?.recoveryRequests?.length || 0,
    },
    {
      key: "reviews",
      label: "مرور عقب‌افتاده",
      count: inbox?.reviews?.length || 0,
    },
    {
      key: "missedTasks",
      label: "فعالیت انجام‌نشده",
      count: inbox?.missedTasks?.length || 0,
    },
    {
      key: "unread",
      label: "پیام خوانده‌نشده",
      count: unread,
    },
  ];
}
