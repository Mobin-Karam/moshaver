/**
 * Backward-compatible public entry for notification types/helpers.
 */
export {
  normalizeAdminNotification,
  notificationAdminUrl,
  notificationTone,
  notificationTypeLabel,
} from "./model/notification-model";

export type {
  AdminNotification,
  NotificationPage,
  PushPreferences,
  PushStatus,
} from "./model/notification-model";
