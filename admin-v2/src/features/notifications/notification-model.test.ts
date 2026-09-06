import { describe, expect, it } from "vitest";
import {
  notificationAdminUrl,
  notificationTone,
  notificationTypeLabel,
} from "./notification-model";

describe("admin notification model", () => {
  it("maps backend deep links into admin routes", () => {
    expect(notificationAdminUrl("/chat/conversations/c1")).toBe("/admin/chat");

    expect(notificationAdminUrl("/exams/e1")).toBe("/admin/exams");

    expect(notificationAdminUrl("/schedule/2026-01-01")).toBe("/admin/planner");

    expect(notificationAdminUrl("https://unsafe.example")).toBe("/admin/notifications");
    expect(notificationAdminUrl()).toBe("/admin/notifications");
    expect(notificationAdminUrl("/admin/audit")).toBe("/admin/audit");
    expect(notificationAdminUrl("/messages/c1")).toBe("/admin/chat");
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
});
