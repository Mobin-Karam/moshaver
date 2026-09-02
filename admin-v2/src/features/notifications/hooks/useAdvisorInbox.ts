import {
  useMemo,
} from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { getAdvisorInbox } from "../api/notifications.api";
import { buildAdvisorInboxRows } from "../lib/notification-utils";

export function useAdvisorInbox(
  studentId: string,
) {
  const inbox =
    useQuery({
      queryKey: [
        "inbox",
        studentId,
      ],
      enabled: !!studentId,
      queryFn: () =>
        getAdvisorInbox(
          studentId,
        ),
    });

  const rows =
    useMemo(
      () =>
        buildAdvisorInboxRows(
          inbox.data,
        ),
      [inbox.data],
    );

  return {
    inbox,
    rows,
  };
}
