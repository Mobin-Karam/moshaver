import { describe, expect, it } from "vitest";
import { adminNavigation, flatAdminNavigation } from "./admin-navigation";

describe("admin navigation metadata", () => {
  it("defines a title and description for every admin destination", () => {
    expect(flatAdminNavigation.map((item) => item.path)).toEqual([
      "", "planner", "exams", "questions", "quizzes", "subjects",
      "live", "chat", "notifications", "students", "reports", "system", "settings",
    ]);
    expect(flatAdminNavigation.every((item) => item.title && item.description)).toBe(true);
    expect(adminNavigation.every((group) => group.items.length > 0)).toBe(true);
  });
});
