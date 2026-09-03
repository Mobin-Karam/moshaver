import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notify } from "../../../shared/ui/notifications";
import {
  getAdvisorInbox,
  updateRecoveryRequest,
  updateTaskIssue,
} from "../api/notifications.api";
import { buildAdvisorInboxRows } from "../lib/notification-utils";
import type {
  RecoveryActionInput,
  TaskIssueActionInput,
} from "../model/notification.types";

export function useAdvisorInbox(studentId: string) {
  const queryClient = useQueryClient();

  const inbox = useQuery({
    queryKey: ["inbox", studentId],
    enabled: !!studentId,
    queryFn: () => getAdvisorInbox(studentId),
    staleTime: 10_000,
  });

  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inbox", studentId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-attention"] }),
    ]);
  };

  const recoveryMutation = useMutation({
    mutationFn: updateRecoveryRequest,
    onSuccess: async (_data, variables) => {
      notify(
        variables.status === "resolved"
          ? "درخواست ریکاوری حل شد و دانش‌آموز مطلع شد."
          : "درخواست ریکاوری رد شد.",
        "success",
      );
      await refreshRelated();
    },
    onError: () => notify("بروزرسانی درخواست ریکاوری انجام نشد.", "error"),
  });

  const issueMutation = useMutation({
    mutationFn: updateTaskIssue,
    onSuccess: async (_data, variables) => {
      notify(
        variables.status === "resolved"
          ? "مشکل فعالیت حل شد."
          : variables.status === "dismissed"
            ? "گزارش مشکل رد شد."
            : "پاسخ مشاور ثبت شد و مورد باز ماند.",
        "success",
      );
      await refreshRelated();
    },
    onError: () => notify("بروزرسانی گزارش مشکل انجام نشد.", "error"),
  });

  const rows = useMemo(() => buildAdvisorInboxRows(inbox.data), [inbox.data]);

  return {
    inbox,
    rows,
    updateRecovery: async (input: RecoveryActionInput) => {
      try {
        await recoveryMutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },
    updateIssue: async (input: TaskIssueActionInput) => {
      try {
        await issueMutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },
    recoveryPendingId: recoveryMutation.isPending ? recoveryMutation.variables?.id || "" : "",
    issuePendingId: issueMutation.isPending ? issueMutation.variables?.id || "" : "",
  };
}
