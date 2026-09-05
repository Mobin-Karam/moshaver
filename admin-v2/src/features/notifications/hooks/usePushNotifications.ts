import { useCallback, useEffect } from "react";
import {
  deletePushSubscription,
  getPushConfig,
  getPushStatusRemote,
  registerPushSubscription,
  sendTestPush,
  updatePushPreferences,
} from "../api/notifications.api";
import {
  defaultPushPreferences,
  supportsPush,
  vapidBytes,
} from "../lib/push";
import { notificationAdminUrl } from "../model/notification-model";
import type {
  PushPreferences,
  PushStatus,
} from "../model/notification-model";

async function currentRegistration() {
  if (!supportsPush()) {
    return null;
  }

  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? null;
  } catch {
    return null;
  }
}

async function currentSubscription() {
  const registration = await currentRegistration();
  if (!registration) {
    return null;
  }

  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

function waitForReady(timeoutMs = 8000) {
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("فعال‌سازی Service Worker بیش از حد طول کشید.")),
      timeoutMs,
    );

    navigator.serviceWorker.ready.then(
      (registration) => {
        window.clearTimeout(timeout);
        resolve(registration);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function ensureServiceWorkerRegistration() {
  const existing = await currentRegistration();
  if (existing) {
    return existing.active ? existing : waitForReady();
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await waitForReady();
  } catch {
    throw new Error(
      "Service Worker اعلان نصب نشد. فایل public/sw.js را در ریشه public برنامه قرار دهید.",
    );
  }
}

export function usePushNotifications(refreshNotifications: () => void) {
  const pushStatus = useCallback(async (): Promise<PushStatus> => {
    if (!supportsPush()) {
      return {
        supported: false,
        permission: "unsupported",
        registered: false,
        serverConfigured: false,
        preferences: defaultPushPreferences,
      };
    }

    const subscription = await currentSubscription();
    const remote = await getPushStatusRemote(subscription?.endpoint);

    return {
      supported: true,
      permission: Notification.permission,
      registered: Boolean(subscription && remote.registered),
      serverConfigured: remote.serverConfigured,
      preferences: remote.preferences || defaultPushPreferences,
    };
  }, []);

  const enablePush = useCallback(async () => {
    if (!supportsPush()) {
      throw new Error("این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند.");
    }

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "اجازه اعلان در تنظیمات مرورگر مسدود شده است."
          : "اجازه اعلان داده نشد.",
      );
    }

    const config = await getPushConfig();
    if (!config.supported || !config.vapidPublicKey) {
      throw new Error("ارسال Push روی سرور تنظیم نشده است.");
    }

    const registration = await ensureServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidBytes(config.vapidPublicKey),
        });
      } catch {
        throw new Error("ساخت اشتراک Push در مرورگر انجام نشد.");
      }
    }

    await registerPushSubscription(subscription.toJSON());
    return pushStatus();
  }, [pushStatus]);

  const disablePush = useCallback(async () => {
    const subscription = await currentSubscription();

    if (subscription) {
      let remoteError: unknown;

      try {
        await deletePushSubscription(subscription.endpoint);
      } catch (error) {
        remoteError = error;
      }

      // Always stop the local subscription even if server cleanup fails.
      await subscription.unsubscribe().catch(() => false);

      if (remoteError) {
        throw remoteError;
      }
    }

    return pushStatus();
  }, [pushStatus]);

  const savePushPreferences = useCallback(async (preferences: PushPreferences) => {
    await updatePushPreferences(preferences);
  }, []);

  const testPush = useCallback(async () => {
    await sendTestPush();
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!supportsPush()) {
      return;
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_RECEIVED") {
        refreshNotifications();
      }

      if (event.data?.type === "NOTIFICATION_CLICK" && event.data.url) {
        window.location.assign(notificationAdminUrl(String(event.data.url)));
      }

      if (
        event.data?.type === "PUSH_SUBSCRIPTION_CHANGED" &&
        Notification.permission === "granted"
      ) {
        void enablePush().catch(() => undefined);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [enablePush, refreshNotifications]);

  return {
    pushStatus,
    enablePush,
    disablePush,
    savePushPreferences,
    testPush,
  };
}
