import { describe, expect, it } from "vitest";
import { roleDashboardMetrics } from "./components/RoleDashboard";
import { quickActionsForRole } from "./model/role-experience";
import type { RoleDashboardData } from "./model/dashboard.types";

describe("role dashboard metrics", () => {
  it.each([
    "GUARDIAN",
    "ADVISOR",
    "TEACHER",
    "MENTOR",
    "CONTENT_MANAGER",
    "ORGANIZATION_ADMIN",
    "PLATFORM_ADMIN",
  ])("builds useful cards for %s", (context) => {
    const cards = roleDashboardMetrics({
      context,
      generatedAt: "2026-01-01",
      assignedStudents: 2,
      unreadConversations: 1,
      children: 1,
      subjects: context === "TEACHER" ? [] : 2,
    } as RoleDashboardData);
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.every((card) => card.label && card.hint && card.value !== undefined)).toBe(true);
  });
});

describe("role dashboard workflows", () => {
  it("prioritizes each role's own work instead of a generic action list", () => {
    expect(quickActionsForRole("GUARDIAN", ["students.read", "plans.read", "reports.read", "chat.read"])[0]).toMatchObject({
      to: "/admin/students",
      label: "دانش‌آموزان",
    });
    expect(quickActionsForRole("CONTENT_MANAGER", ["learning_resources.manage", "questions.read"])[0].to).toBe("/admin/resources");
    expect(quickActionsForRole("PLATFORM_ADMIN", ["student_onboarding.manage", "users.read"])[0].to).toBe("/admin/onboarding");
  });

  it("never exposes an action missing from the active capability set", () => {
    const actions = quickActionsForRole("TEACHER", ["exams.read", "subjects.read"]);
    expect(actions.map((item) => item.to)).toEqual(["/admin/exams", "/admin/subjects"]);
    expect(actions.some((item) => item.to === "/admin/questions")).toBe(false);
  });
});
