import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/api";
import { notify } from "../../../shared/ui/notifications";
import { chatKeys } from "../api/chat.keys";

export function useMessageActions(conversationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ method, path, body }: { method: "post" | "delete"; path: string; body?: unknown }) =>
      method === "post" ? api.post(path, body) : api.delete(path),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) }),
    onError: (error) =>
      notify(error instanceof Error ? error.message : "عملیات پیام ناموفق بود.", "error"),
  });
}
