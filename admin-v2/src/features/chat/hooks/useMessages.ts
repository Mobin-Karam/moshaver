import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchMessages } from "../api/chat.api";
import { chatKeys } from "../api/chat.keys";
import { mergeMessagePages } from "../lib/chat-helpers";

export function useMessages(conversationId?: string) {
  const query = useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    enabled: !!conversationId,
    initialPageParam: "",
    queryFn: ({ pageParam }) => fetchMessages(conversationId!, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextBeforeMessageId : undefined,
    refetchInterval: 20_000,
  });
  const items = useMemo(() => mergeMessagePages(query.data), [query.data]);
  return { ...query, items };
}
