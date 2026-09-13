import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationSettings } from "./components/NotificationSettings";
import type { PushStatus } from "./model/notification-model";
import type { NotificationContextValue } from "./model/notification.types";

afterEach(cleanup);

const preferences = { lessons: true, messages: true, exams: true, announcements: true };

function controller(status: PushStatus): NotificationContextValue {
  return {
    items: [],
    unread: 0,
    loading: false,
    error: false,
    errorMessage: null,
    forbidden: false,
    hasMore: false,
    loadingMore: false,
    refreshing: false,
    markingAllRead: false,
    soundEnabled: true,
    chatSoundEnabled: true,
    setSoundEnabled: vi.fn(),
    setChatSoundEnabled: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    loadMore: vi.fn(),
    refresh: vi.fn(),
    pushStatus: vi.fn().mockResolvedValue(status),
    enablePush: vi.fn().mockResolvedValue({ ...status, permission: "granted", registered: true }),
    disablePush: vi.fn().mockResolvedValue({ ...status, registered: false }),
    savePushPreferences: vi.fn().mockResolvedValue(undefined),
    testPush: vi.fn().mockResolvedValue(undefined),
    testSound: vi.fn(),
  };
}

describe("Web Push settings", () => {
  it.each([
    [
      {
        supported: false,
        permission: "unsupported",
        registered: false,
        serverConfigured: false,
        preferences,
      },
      "پشتیبانی نمی‌کند",
    ],
    [
      {
        supported: true,
        permission: "denied",
        registered: false,
        serverConfigured: true,
        preferences,
      },
      "مسدود شده است",
    ],
    [
      {
        supported: true,
        permission: "default",
        registered: false,
        serverConfigured: true,
        preferences,
      },
      "منتظر اجازه مرورگر",
    ],
    [
      {
        supported: true,
        permission: "granted",
        registered: false,
        serverConfigured: true,
        preferences,
      },
      "غیرفعال است",
    ],
    [
      {
        supported: true,
        permission: "granted",
        registered: true,
        serverConfigured: true,
        preferences,
      },
      "فعال است",
    ],
  ] as Array<[PushStatus, string]>)("renders the explicit state %#", async (status, copy) => {
    render(<NotificationSettings notifications={controller(status)} />);
    expect(await screen.findByText(new RegExp(copy))).toBeInTheDocument();
  });

  it("covers enable, preferences, test request, and disable controls", async () => {
    const status: PushStatus = {
      supported: true,
      permission: "default",
      registered: false,
      serverConfigured: true,
      preferences,
    };
    const notifications = controller(status);
    const view = render(<NotificationSettings notifications={notifications} />);

    await userEvent.click(await screen.findByRole("button", { name: "فعال‌کردن اعلان سیستمی" }));
    await waitFor(() => expect(notifications.enablePush).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByRole("checkbox", { name: "اعلان پیام‌ها" }));
    await waitFor(() => expect(notifications.savePushPreferences).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "ارسال اعلان آزمایشی" }));
    await waitFor(() => expect(notifications.testPush).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByRole("button", { name: "غیرفعال‌کردن Push" }));
    await waitFor(() => expect(notifications.disablePush).toHaveBeenCalledOnce());

    view.unmount();
  });
});
