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
import type { NotificationPage } from "../model/notification-model";

export function useNotificationInbox(
  enabled: boolean,
) {
  const queryClient =
    useQueryClient();

  const inbox =
    useInfiniteQuery({
      queryKey: [
        "notifications",
      ],

      enabled,

      initialPageParam: "",

      queryFn: ({
        pageParam,
      }) =>
        getNotificationsPage(
          pageParam
            ? String(pageParam)
            : undefined,
        ),

      getNextPageParam: (
        last,
      ) =>
        last.hasMore
          ? last.nextCursor ||
            undefined
          : undefined,
    });

  const items =
    inbox.data?.pages.flatMap(
      (page) => page.items,
    ) || [];

  const unread =
    inbox.data?.pages[0]
      ?.unreadCount ??
    items.reduce(
      (count, item) =>
        count +
        (item.isRead ? 0 : 1),
      0,
    );

  const read = useMutation({
    mutationFn:
      markNotificationRead,

    onMutate: async (id) => {
      await queryClient.cancelQueries(
        {
          queryKey: [
            "notifications",
          ],
        },
      );

      queryClient.setQueriesData<
        InfiniteData<NotificationPage>
      >(
        {
          queryKey: [
            "notifications",
          ],
        },
        (old) =>
          old
            ? {
                ...old,
                pages:
                  old.pages.map(
                    (
                      page,
                      index,
                    ) => ({
                      ...page,
                      unreadCount:
                        index === 0
                          ? Math.max(
                              0,
                              Number(
                                page.unreadCount ||
                                  0,
                              ) -
                                (page.items.find(
                                  (
                                    item,
                                  ) =>
                                    item.id ===
                                      id &&
                                    !item.isRead,
                                )
                                  ? 1
                                  : 0),
                            )
                          : page.unreadCount,

                      items:
                        page.items.map(
                          (item) =>
                            item.id ===
                            id
                              ? {
                                  ...item,
                                  isRead:
                                    true,
                                }
                              : item,
                        ),
                    }),
                  ),
              }
            : old,
      );
    },

    onError: () => {
      notify(
        "خواندن اعلان ثبت نشد.",
        "error",
      );

      void inbox.refetch();
    },
  });

  const readAll =
    useMutation({
      mutationFn:
        markAllNotificationsRead,

      onMutate: async () => {
        await queryClient.cancelQueries(
          {
            queryKey: [
              "notifications",
            ],
          },
        );

        queryClient.setQueriesData<
          InfiniteData<NotificationPage>
        >(
          {
            queryKey: [
              "notifications",
            ],
          },
          (old) =>
            old
              ? {
                  ...old,
                  pages:
                    old.pages.map(
                      (page) => ({
                        ...page,
                        unreadCount:
                          0,
                        items:
                          page.items.map(
                            (
                              item,
                            ) => ({
                              ...item,
                              isRead:
                                true,
                            }),
                          ),
                      }),
                    ),
                }
              : old,
        );
      },

      onError: () => {
        notify(
          "خواندن همه اعلان‌ها ثبت نشد.",
          "error",
        );

        void inbox.refetch();
      },
    });

  return {
    inbox,
    items,
    unread,
    markRead: (
      id: string,
    ) => read.mutate(id),
    markAllRead: () =>
      readAll.mutate(),
  };
}
