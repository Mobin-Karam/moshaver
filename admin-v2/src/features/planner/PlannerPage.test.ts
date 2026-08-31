import { describe, expect, it } from "vitest";
import { plannerRange, planWarnings } from "./PlannerPage";
import type { Plan } from "../../types/domain";

describe("planner parity helpers", () => {
  it("builds Saturday-first week and exact month ranges", () => {
    expect(plannerRange("2026-08-31", "day")).toEqual({
      from: "2026-08-31",
      to: "2026-08-31",
    });
    expect(plannerRange("2026-08-31", "week")).toEqual({
      from: "2026-08-29",
      to: "2026-09-04",
    });
    expect(plannerRange("2026-02-12", "month")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("reports overlaps, late tasks, and overloaded days", () => {
    const plan: Plan = {
      id: "p1",
      planDate: "2026-08-31",
      published: false,
      tasks: [
        { id: "t1", type: "study", start: "08:00", end: "17:00" },
        { id: "t2", type: "review", start: "16:30", end: "23:00" },
      ],
    };
    const warnings = planWarnings([plan]);
    expect(warnings.some((item) => item.includes("تداخل"))).toBe(true);
    expect(warnings.some((item) => item.includes("دیرهنگام"))).toBe(true);
    expect(warnings.some((item) => item.includes("۸ ساعت"))).toBe(true);
  });
});
