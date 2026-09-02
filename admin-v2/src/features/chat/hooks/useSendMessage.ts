import { useMutation } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";

export type SendMessageInput = {
  conversationId: string;
  text: string;
  replyToId?: string;
  editingId?: string;
};

export function useSendMessage(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      input.editingId
        ? chatApi.edit(input.editingId, input.text)
        : chatApi.send(input.conversationId, input.text, input.replyToId),
    onSuccess: options?.onSuccess,
    onError: (error) => options?.onError?.(error),
  });
}
