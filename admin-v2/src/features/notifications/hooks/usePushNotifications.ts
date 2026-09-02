import {
  useEffect,
} from "react";
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
import type {
  PushPreferences,
  PushStatus,
} from "../model/notification-model";

async function currentSubscription() {
  if (
    !(
      "serviceWorker" in
      navigator
    )
  ) {
    return null;
  }

  return (
    await navigator
      .serviceWorker.ready
  ).pushManager.getSubscription();
}

export function usePushNotifications(
  refreshNotifications: () => void,
) {
  async function pushStatus(): Promise<PushStatus> {
    const subscription =
      await currentSubscription();

    const remote =
      await getPushStatusRemote(
        subscription?.endpoint,
      );

    return {
      supported:
        supportsPush(),
      permission:
        supportsPush()
          ? Notification.permission
          : "unsupported",
      registered:
        !!subscription &&
        remote.registered,
      serverConfigured:
        remote.serverConfigured,
      preferences:
        remote.preferences ||
        defaultPushPreferences,
    };
  }

  async function enablePush() {
    if (!supportsPush()) {
      throw new Error(
        "این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند.",
      );
    }

    const permission =
      Notification.permission ===
      "default"
        ? await Notification.requestPermission()
        : Notification.permission;

    if (
      permission !== "granted"
    ) {
      throw new Error(
        permission === "denied"
          ? "اجازه اعلان در تنظیمات مرورگر مسدود شده است."
          : "اجازه اعلان داده نشد.",
      );
    }

    const config =
      await getPushConfig();

    if (
      !config.supported ||
      !config.vapidPublicKey
    ) {
      throw new Error(
        "ارسال Push روی سرور تنظیم نشده است.",
      );
    }

    const registration =
      await navigator
        .serviceWorker.ready;

    let subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe(
          {
            userVisibleOnly:
              true,
            applicationServerKey:
              vapidBytes(
                config.vapidPublicKey,
              ),
          },
        );
    }

    await registerPushSubscription(
      subscription.toJSON(),
    );

    return pushStatus();
  }

  async function disablePush() {
    const subscription =
      await currentSubscription();

    if (subscription) {
      await deletePushSubscription(
        subscription.endpoint,
      );

      await subscription.unsubscribe();
    }

    return pushStatus();
  }

  async function savePushPreferences(
    preferences: PushPreferences,
  ) {
    await updatePushPreferences(
      preferences,
    );
  }

  async function testPush() {
    await sendTestPush();
    refreshNotifications();
  }

  useEffect(() => {
    if (
      "serviceWorker" in
      navigator
    ) {
      void navigator.serviceWorker.register(
        "/sw.js",
      );
    }
  }, []);

  useEffect(() => {
    if (
      !(
        "serviceWorker" in
        navigator
      )
    ) {
      return;
    }

    const handler = (
      event: MessageEvent,
    ) => {
      if (
        event.data?.type ===
        "PUSH_RECEIVED"
      ) {
        refreshNotifications();
      }

      if (
        event.data?.type ===
          "NOTIFICATION_CLICK" &&
        event.data.url
      ) {
        window.location.assign(
          event.data.url,
        );
      }

      if (
        event.data?.type ===
          "PUSH_SUBSCRIPTION_CHANGED" &&
        "Notification" in
          window &&
        Notification.permission ===
          "granted"
      ) {
        void enablePush().catch(
          () => undefined,
        );
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      handler,
    );

    return () =>
      navigator.serviceWorker.removeEventListener(
        "message",
        handler,
      );
  });

  return {
    pushStatus,
    enablePush,
    disablePush,
    savePushPreferences,
    testPush,
  };
}
