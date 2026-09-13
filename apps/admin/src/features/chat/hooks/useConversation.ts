import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";
import { chatKeys } from "../api/chat.keys";

export function useConversation(conversationId?: string, group = false) {
  return useQuery({
    queryKey: chatKeys.group(conversationId),
    enabled: group && !!conversationId,
    queryFn: () => chatApi.group(conversationId!),
  });
}
