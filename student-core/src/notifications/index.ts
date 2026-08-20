import type { NotificationItem } from '../types.js';

export function countUnread(notifications: NotificationItem[]): number {
  return notifications.filter((item) => !item.isRead).length;
}

export function markNotificationRead(
  notifications: NotificationItem[],
  id: string,
): NotificationItem[] {
  return notifications.map((item) => (item.id === id ? { ...item, isRead: true } : item));
}
