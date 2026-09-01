import { describe, expect, it } from "vitest";
import { adminBreadcrumbs, adminNavigation, flatAdminNavigation, mainAdminNavigation } from "./admin-navigation";

describe("admin navigation metadata", () => {
  it("defines a title and description for every admin destination", () => {
    expect(flatAdminNavigation.map((item) => item.path)).toEqual([
      "", "planner", "exams", "questions", "quizzes", "subjects",
      "live", "chat", "notifications", "students", "reports", "system", "settings",
    ]);
    expect(flatAdminNavigation.every((item) => item.title && item.description)).toBe(true);
    expect(adminNavigation.every((group) => group.items.length > 0)).toBe(true);
    expect(mainAdminNavigation.map((item) => item.path)).toEqual(["", "planner", "live", "students", "system"]);
    expect(mainAdminNavigation.map((item) => item.title)).toEqual(["خانه", "آموزش", "ارتباط", "مدیریت", "سامانه"]);
  });
  it("builds breadcrumbs from the section and route hierarchy", () => {
    expect(adminBreadcrumbs("")).toEqual([{ title: "خانه", path: "" }]);
    expect(adminBreadcrumbs("exams")).toEqual([
      { title: "خانه", path: "" },
      { title: "آموزش", path: "planner" },
      { title: "آزمون‌ها", path: "exams" },
    ]);
    expect(adminBreadcrumbs("settings").map((item) => item.title)).toEqual(["خانه", "سامانه", "تنظیمات"]);
  });
});
