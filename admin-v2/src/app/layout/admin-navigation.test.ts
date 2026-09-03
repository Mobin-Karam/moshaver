import { describe, expect, it } from "vitest";
import { adminBreadcrumbs, adminDestination, adminNavigation, flatAdminNavigation, mainAdminNavigation, normalizeAdminPath, resolveAdminNavigation } from "./admin-navigation";

describe("admin navigation metadata", () => {
  it("defines a title and description for every admin destination", () => {
    expect(flatAdminNavigation.map((item) => item.path)).toEqual([
      "", "planner", "learning", "exams", "questions", "quizzes", "subjects",
      "live", "chat", "notifications", "students", "reports", "system", "settings",
    ]);
    expect(flatAdminNavigation.every((item) => item.title && item.description)).toBe(true);
    expect(adminNavigation.every((group) => group.items.length > 0)).toBe(true);
    expect(mainAdminNavigation.map((item) => item.path)).toEqual(["", "planner", "live", "students", "system"]);
    expect(mainAdminNavigation.map((item) => item.title)).toEqual(["خانه", "آموزش", "ارتباط", "مدیریت", "سامانه"]);
  });

  it("resolves browser URLs, nested learning locations, and aliases", () => {
    expect(normalizeAdminPath("/admin/exams/42?tab=questions")).toBe("exams/42");
    expect(resolveAdminNavigation("/admin/exams/42").path).toBe("exams");
    expect(resolveAdminNavigation("/admin/education").path).toBe("learning");
    expect(resolveAdminNavigation("/admin/students/s-1/learning").path).toBe("learning");
    expect(adminBreadcrumbs("/admin/students/s-1/learning").at(-1)?.title).toBe("سیستم یادگیری");
  });

  it("avoids duplicate breadcrumb destinations on section landing pages", () => {
    expect(adminBreadcrumbs("")).toEqual([{ title: "خانه", path: "" }]);
    expect(adminBreadcrumbs("planner")).toEqual([
      { title: "خانه", path: "" },
      { title: "آموزش", path: "planner" },
    ]);
    expect(adminBreadcrumbs("exams")).toEqual([
      { title: "خانه", path: "" },
      { title: "آموزش", path: "planner" },
      { title: "آزمون‌ها", path: "exams" },
    ]);
    expect(adminBreadcrumbs("settings").map((item) => item.title)).toEqual(["خانه", "سامانه", "تنظیمات"]);
  });

  it("carries student context only between Education destinations", () => {
    expect(adminDestination("exams", "آموزش", "student 1")).toBe("/admin/exams?studentId=student%201");
    expect(adminDestination("chat", "ارتباط", "student-1")).toBe("/admin/chat");
  });
});
