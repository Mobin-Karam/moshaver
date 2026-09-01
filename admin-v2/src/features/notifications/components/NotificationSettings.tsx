import {
  useEffect,
  useState,
} from "react";
import {
  Button,
} from "../../../shared/ui/ui";
import {
  notify,
} from "../../../shared/ui/notifications";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import type { PushStatus } from "../model/notification-model";
import { NotificationPreference } from "./NotificationPreference";

export function NotificationSettings() {
  const notifications =
    useAdminNotifications();

  const [
    status,
    setStatus,
  ] =
    useState<PushStatus | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [busy, setBusy] =
    useState("");

  useEffect(() => {
    void notifications
      .pushStatus()
      .then(setStatus)
      .catch(() => null)
      .finally(() =>
        setLoading(false),
      );
  }, []);

  async function action(
    name: string,
    work: () => Promise<
      PushStatus | void
    >,
  ) {
    setBusy(name);

    try {
      const next =
        await work();

      if (next) {
        setStatus(next);
      }

      notify(
        "تنظیمات اعلان ذخیره شد.",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "عملیات اعلان ناموفق بود.",
        "error",
      );
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
    );
  }

  const message =
    !status?.supported
      ? "این مرورگر Push را پشتیبانی نمی‌کند."
      : !status.serverConfigured
        ? "کلیدهای Web Push روی سرور تنظیم نشده‌اند."
        : status.permission ===
            "denied"
          ? "اجازه اعلان در تنظیمات مرورگر مسدود شده است."
          : status.registered
            ? "اعلان سیستمی این دستگاه فعال است."
            : "برای دریافت اعلان در پس‌زمینه، دستگاه را فعال کنید.";

  return (
    <div className="grid gap-4">
      <div
        className={[
          "rounded-lg p-3 text-sm",
          status?.registered
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-800",
        ].join(" ")}
      >
        {message}
      </div>

      <div className="flex flex-wrap gap-2">
        {status?.registered ? (
          <Button
            variant="danger"
            loading={
              busy === "disable"
            }
            onClick={() =>
              void action(
                "disable",
                notifications.disablePush,
              )
            }
          >
            غیرفعال‌کردن Push
          </Button>
        ) : (
          <Button
            loading={
              busy === "enable"
            }
            disabled={
              !status?.supported ||
              !status.serverConfigured
            }
            onClick={() =>
              void action(
                "enable",
                notifications.enablePush,
              )
            }
          >
            فعال‌کردن اعلان سیستمی
          </Button>
        )}

        <Button
          variant="soft"
          disabled={
            !status?.registered
          }
          loading={
            busy === "test"
          }
          onClick={() =>
            void action(
              "test",
              async () => {
                await notifications.testPush();
              },
            )
          }
        >
          ارسال اعلان آزمایشی
        </Button>

        <Button
          variant="ghost"
          onClick={() =>
            notifications.testSound(
              false,
            )
          }
        >
          آزمایش صدا
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <NotificationPreference
          label="پیام‌ها"
          name="messages"
          status={status}
          save={
            notifications.savePushPreferences
          }
          setStatus={
            setStatus
          }
        />

        <NotificationPreference
          label="آزمون‌ها"
          name="exams"
          status={status}
          save={
            notifications.savePushPreferences
          }
          setStatus={
            setStatus
          }
        />

        <NotificationPreference
          label="برنامه و درس"
          name="lessons"
          status={status}
          save={
            notifications.savePushPreferences
          }
          setStatus={
            setStatus
          }
        />

        <NotificationPreference
          label="اطلاعیه‌ها"
          name="announcements"
          status={status}
          save={
            notifications.savePushPreferences
          }
          setStatus={
            setStatus
          }
        />
      </div>
    </div>
  );
}
