import type {
  AdminNotification,
  PushPreferences,
  PushStatus,
} from "./notification-model";

export type NotificationContextValue = {
  items: AdminNotification[];
  unread: number;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  soundEnabled: boolean;
  chatSoundEnabled: boolean;

  setSoundEnabled: (
    value: boolean,
  ) => void;

  setChatSoundEnabled: (
    value: boolean,
  ) => void;

  markRead: (
    id: string,
  ) => void;

  markAllRead: () => void;
  loadMore: () => void;
  refresh: () => void;

  pushStatus: () => Promise<PushStatus>;
  enablePush: () => Promise<PushStatus>;
  disablePush: () => Promise<PushStatus>;

  savePushPreferences: (
    preferences: PushPreferences,
  ) => Promise<void>;

  testPush: () => Promise<void>;

  testSound: (
    chat?: boolean,
  ) => void;
};

export type AdvisorInbox =
  Record<string, unknown[]>;

export type AdvisorInboxRow = {
  type: string;
  value: unknown;
  tone:
    | "red"
    | "amber"
    | "blue";
};
