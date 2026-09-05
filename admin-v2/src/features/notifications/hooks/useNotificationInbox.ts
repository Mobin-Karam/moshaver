import { useCallback } from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { notify } from "../../../shared/ui/notifications";
import {
  getNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import {
  getHttpStatus,
  notificationRequestErrorMessage,
  shouldRetryNotificationRequest,
} from "../lib/api-error";
import type { NotificationPage } from "../model/notification-model";

const notificationQueryKey = ["notifications"] as const;

export function useNotificationInbox(enabled: boolean) {
  const queryClient = useQueryClient();

  const inbox = useInfiniteQuery({
    queryKey: notificationQueryKey,
    enabled,
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getNotificationsPage(pageParam ? String(pageParam) : undefined),
    getNextPageParam: (last) =>
      last.hasMore ? last.nextCursor || undefined : undefined,
    staleTime: 15_000,
    retry: shouldRetryNotificationRequest,
    // Prevent a forbidden endpoint from being hit again whenever the tab regains focus.
    refetchOnWindowFocus: false,
  });

  const items = inbox.data?.pages.flatMap((page) => page.items) || [];
  const unread =
    inbox.data?.pages[0]?.unreadCount ??
    items.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);

  const restoreQueries = (
    previous?: Array<[readonly unknown[], InfiniteData<NotificationPage> | undefined]>,
  ) => {
    previous?.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  };

  const read = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKey });
      const previous = queryClient.getQueriesData<InfiniteData<NotificationPage>>({
        queryKey: notificationQueryKey,
      });

      queryClient.setQueriesData<InfiniteData<NotificationPage>>(
        { queryKey: notificationQueryKey },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page, index) => {
                  const targetWasUnread = page.items.some(
                    (item) => item.id === id && !item.isRead,
                  );

                  return {
                    ...page,
                    unreadCount:
                      index === 0 && targetWasUnread
                        ? Math.max(0, Number(page.unreadCount || 0) - 1)
                        : page.unreadCount,
                    items: page.items.map((item) =>
                      item.id === id ? { ...item, isRead: true } : item,
                    ),
                  };
                }),
              }
            : old,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      restoreQueries(context?.previous);
      notify("خواندن اعلان ثبت نشد.", "error");
    },
  });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKey });
      const previous = queryClient.getQueriesData<InfiniteData<NotificationPage>>({
        queryKey: notificationQueryKey,
      });

      queryClient.setQueriesData<InfiniteData<NotificationPage>>(
        { queryKey: notificationQueryKey },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  unreadCount: 0,
                  items: page.items.map((item) => ({ ...item, isRead: true })),
                })),
              }
            : old,
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      restoreQueries(context?.previous);
      notify("خواندن همه اعلان‌ها ثبت نشد.", "error");
    },
  });

  const refresh = useCallback(() => {
    void inbox.refetch();
  }, [inbox.refetch]);

  const loadMore = useCallback(() => {
    if (!inbox.hasNextPage || inbox.isFetchingNextPage) {
      return;
    }
    void inbox.fetchNextPage();
  }, [inbox.fetchNextPage, inbox.hasNextPage, inbox.isFetchingNextPage]);

  const markRead = useCallback(
    (id: string) => read.mutate(id),
    [read.mutate],
  );

  const markAllRead = useCallback(() => {
    if (!readAll.isPending && unread > 0) {
      readAll.mutate();
    }
  }, [readAll.isPending, readAll.mutate, unread]);

  const status = getHttpStatus(inbox.error);

  return {
    inbox,
    items,
    unread,
    errorMessage: inbox.isError ? notificationRequestErrorMessage(inbox.error) : null,
    forbidden: status === 403,
    refreshing: inbox.isFetching && !inbox.isLoading && !inbox.isFetchingNextPage,
    markingAllRead: readAll.isPending,
    markRead,
    markAllRead,
    refresh,
    loadMore,
  };
}
