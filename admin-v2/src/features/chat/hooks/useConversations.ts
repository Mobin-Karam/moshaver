import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Conversation } from "../../../shared/types/domain";
import { fetchConversationPage } from "../api/chat.api";
import { chatKeys } from "../api/chat.keys";
import { sortConversations } from "../lib/chat-helpers";
import type { CombinedConversationPage, ConversationCursor } from "../model/chat.types";

const initialCursor: ConversationCursor = {
  directOffset: 0,
  groupOffset: 0,
  directDone: false,
  groupDone: false,
};

export function useConversations(search: string) {
  const query = useInfiniteQuery<
    CombinedConversationPage,
    Error,
    InfiniteData<CombinedConversationPage>,
    ReturnType<typeof chatKeys.conversations>,
    ConversationCursor
  >({
    queryKey: chatKeys.conversations(search),
    initialPageParam: initialCursor,
    queryFn: ({ pageParam }) => fetchConversationPage(pageParam, search),
    getNextPageParam: (page) => page.next,
    refetchInterval: 30_000,
  });
  const items = useMemo(() => {
    const seen = new Set<string>();
    return sortConversations(
      (query.data?.pages ?? [])
        .flatMap((page) => page.items)
        .filter((item) => !seen.has(item.id) && !!seen.add(item.id)),
    );
  }, [query.data]);
  return {
    ...query,
    items,
    total:
      query.data?.pages[0]
        ? query.data.pages[0].directTotal + query.data.pages[0].groupTotal
        : items.length,
    unread: items.reduce((sum: number, item: Conversation) => sum + Number(item.unread || 0), 0),
  };
}
