import { describe, expect, it } from "vitest";
import {
  normalizeAdminNotification,
  notificationAdminUrl,
  notificationTone,
  notificationTypeLabel,
} from "./notification-model";

describe("admin notification model", () => {
  it("maps backend deep links into admin routes", () => {
    expect(notificationAdminUrl("/chat/conversations/c1")).toBe("/admin/communication/chat");

    expect(notificationAdminUrl("/exams/e1")).toBe("/admin/exams");

    expect(notificationAdminUrl("/schedule/2026-01-01")).toBe("/admin/planner");

    expect(notificationAdminUrl("https://unsafe.example")).toBe(
      "/admin/communication/notifications",
    );
    expect(notificationAdminUrl()).toBe("/admin/communication/notifications");
    expect(notificationAdminUrl("/admin/audit")).toBe("/admin/audit");
    expect(notificationAdminUrl("/messages/c1")).toBe("/admin/communication/chat");
    expect(notificationAdminUrl("/plans/2026-01-01")).toBe("/admin/planner");
  });

  it("provides consistent labels and colors", () => {
    expect(notificationTypeLabel("message")).toBe("پیام");
    expect(notificationTypeLabel("announcement")).toBe("اطلاعیه");
    expect(notificationTypeLabel()).toBe("اعلان");
    expect(notificationTone("message")).toBe("blue");
    expect(notificationTone("exam")).toBe("amber");
    expect(notificationTone("lesson")).toBe("green");
    expect(notificationTone("other")).toBe("neutral");
  });

  it("normalizes backend v2 enums, body aliases and read state", () => {
    expect(
      normalizeAdminNotification({
        id: "n1",
        title: "آزمون فردا",
        type: "EXAM_REMINDER",
        message: "ساعت هشت",
        readAt: "2026-09-07T08:00:00Z",
      }),
    ).toMatchObject({ type: "exam", body: "ساعت هشت", isRead: true });
  });
});
