import {
  createContext,
  type ReactNode,
} from "react";
import {
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { useNotificationInbox } from "../hooks/useNotificationInbox";
import { useNotificationRealtime } from "../hooks/useNotificationRealtime";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { usePushNotifications } from "../hooks/usePushNotifications";
import type { NotificationContextValue } from "../model/notification.types";

export const NotificationContext =
  createContext<
    NotificationContextValue | null
  >(null);

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const auth = useAuth();

  const queryClient =
    useQueryClient();

  const notifications =
    useNotificationInbox(
      auth.status ===
        "authenticated",
    );

  const sound =
    useNotificationSound();

  const push =
    usePushNotifications(
      () => {
        void notifications.inbox.refetch();
      },
    );

  useNotificationRealtime({
    authenticated:
      auth.status ===
      "authenticated",
    queryClient,
    soundEnabled:
      sound.soundEnabled,
    chatSoundEnabled:
      sound.chatSoundEnabled,
    playSound:
      sound.playSound,
  });

  const value: NotificationContextValue =
    {
      items:
        notifications.items,
      unread:
        notifications.unread,

      loading:
        notifications.inbox
          .isLoading,

      error:
        notifications.inbox
          .isError,

      hasMore:
        notifications.inbox
          .hasNextPage,

      loadingMore:
        notifications.inbox
          .isFetchingNextPage,

      soundEnabled:
        sound.soundEnabled,

      chatSoundEnabled:
        sound.chatSoundEnabled,

      setSoundEnabled:
        sound.setSoundEnabled,

      setChatSoundEnabled:
        sound.setChatSoundEnabled,

      markRead:
        notifications.markRead,

      markAllRead:
        notifications.markAllRead,

      loadMore: () => {
        void notifications.inbox.fetchNextPage();
      },

      refresh: () => {
        void notifications.inbox.refetch();
      },

      pushStatus:
        push.pushStatus,

      enablePush:
        push.enablePush,

      disablePush:
        push.disablePush,

      savePushPreferences:
        push.savePushPreferences,

      testPush:
        push.testPush,

      testSound:
        sound.playSound,
    };

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}
