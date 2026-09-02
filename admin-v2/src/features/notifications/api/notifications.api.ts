import { api } from "../../../shared/api/api";
import type {
  NotificationPage,
  PushPreferences,
  PushStatus,
} from "../model/notification-model";
import type { AdvisorInbox } from "../model/notification.types";

export function getNotificationsPage(
  before?: string,
) {
  return api.get<NotificationPage>(
    `/notifications?limit=20${
      before
        ? `&before=${encodeURIComponent(
            before,
          )}`
        : ""
    }`,
  );
}

export function markNotificationRead(
  id: string,
) {
  return api.put(
    `/notifications/${id}/read`,
    {},
  );
}

export function markAllNotificationsRead() {
  return api.put(
    "/notifications/read-all",
    {},
  );
}

export function getAdvisorInbox(
  studentId: string,
) {
  return api.get<AdvisorInbox>(
    `/admin/advisor-inbox?studentId=${encodeURIComponent(
      studentId,
    )}`,
  );
}

export function getPushStatusRemote(
  endpoint?: string,
) {
  return api.get<
    Omit<
      PushStatus,
      "supported" | "permission"
    >
  >(
    `/push/status${
      endpoint
        ? `?endpoint=${encodeURIComponent(
            endpoint,
          )}`
        : ""
    }`,
  );
}

export function getPushConfig() {
  return api.get<{
    supported: boolean;
    vapidPublicKey: string;
  }>("/push/config");
}

export function registerPushSubscription(
  subscription: PushSubscriptionJSON,
) {
  return api.post(
    "/push/subscriptions",
    subscription,
  );
}

export function deletePushSubscription(
  endpoint: string,
) {
  return api.delete(
    `/push/subscriptions?endpoint=${encodeURIComponent(
      endpoint,
    )}`,
  );
}

export function updatePushPreferences(
  preferences: PushPreferences,
) {
  return api.put(
    "/push/preferences",
    preferences,
  );
}

export function sendTestPush() {
  return api.post(
    "/push/test",
    {},
  );
}
