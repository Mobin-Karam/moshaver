/**
 * Backward-compatible public entry.
 *
 * Existing imports can keep using:
 *   import {
 *     NotificationProvider,
 *     useAdminNotifications,
 *   } from ".../features/notifications/NotificationProvider";
 */
export { NotificationProvider } from "./components/NotificationProvider";
export { useAdminNotifications } from "./hooks/useAdminNotifications";
