# Admin v2 Web Push verification

## Automated contract

The Admin v2 suite verifies unsupported, permission-denied, waiting-permission, disabled, and enabled states plus enable, preference save, test request, and disable controls. Backend persistence and recipient ownership are covered by backend tests and the disposable security matrix.

An accepted `/push/test` response proves only that the test notification was recorded and delivery was attempted. It does **not** prove that an external push provider or browser received it.

## Production-like browser checklist

Prerequisites: HTTPS origin, valid `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`, a supported browser, and an authenticated non-student Admin v2 role.

1. Open Notification settings and confirm the server is configured.
2. Select **فعال‌کردن اعلان سیستمی** and accept browser permission.
3. Confirm `POST /api/v2/push/subscriptions` succeeds and the UI becomes enabled.
4. Change one category and confirm `PUT /api/v2/push/preferences` persists after reopening settings.
5. Select **ارسال اعلان آزمایشی**.
6. Confirm both the durable in-app notification and the operating-system notification arrive.
7. Select the notification and confirm it opens a safe Admin v2 route.
8. Disable Push and confirm the browser subscription and server record are removed.

## Current result

**PENDING EXTERNAL VERIFICATION.** This workspace has no browser runtime or production VAPID credentials, so receipt must not be reported as passed. Record browser, origin, timestamp, recipient, and received notification ID here when staging verification is performed.
