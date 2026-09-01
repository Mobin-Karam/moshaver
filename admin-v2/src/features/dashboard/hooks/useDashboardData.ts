import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAdvisorInbox,
  getDashboardChatConversations,
  getDashboardOverview,
} from "../api/dashboard.api";
import {
  getAttentionItems,
  getInboxCount,
  getUnreadConversationCount,
} from "../lib/dashboard-metrics";

export function useDashboardData(
  studentId: string,
) {
  const overview = useQuery({
    queryKey: ["overview", studentId],
    enabled: !!studentId,
    queryFn: () =>
      getDashboardOverview(studentId),
  });

  const inbox = useQuery({
    queryKey: ["inbox", studentId],
    enabled: !!studentId,
    queryFn: () =>
      getAdvisorInbox(studentId),
  });

  const chat = useQuery({
    queryKey: ["chat-conversations"],
    queryFn:
      getDashboardChatConversations,
  });

  const metrics =
    overview.data?.todayMetrics ?? {};

  const unread = useMemo(
    () =>
      getUnreadConversationCount(
        chat.data ?? [],
        studentId,
      ),
    [chat.data, studentId],
  );

  const inboxCount = useMemo(
    () =>
      getInboxCount(
        inbox.data,
        unread,
      ),
    [inbox.data, unread],
  );

  const attentionItems = useMemo(
    () =>
      getAttentionItems(
        inbox.data,
        unread,
      ),
    [inbox.data, unread],
  );

  return {
    overview,
    inbox,
    chat,
    metrics,
    unread,
    inboxCount,
    attentionItems,
  };
}
