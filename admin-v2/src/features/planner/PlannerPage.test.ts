import { describe, expect, it } from "vitest";
import {
  filterPlans,
  optimisticMove,
  plannerRange,
  planWarnings,
} from "./PlannerPage";
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

  it("supports list ranges and task filters", () => {
    expect(plannerRange("2026-08-31", "list")).toEqual({
      from: "2026-08-01",
      to: "2026-09-30",
    });
    const plans: Plan[] = [
      {
        id: "p1",
        planDate: "2026-08-31",
        published: false,
        tasks: [{ id: "t1", type: "study", title: "فیزیک" }],
      },
      {
        id: "p2",
        planDate: "2026-09-01",
        published: true,
        tasks: [{ id: "t2", type: "test", title: "ریاضی" }],
      },
    ];
    expect(filterPlans(plans, "فیزیک", "all")).toHaveLength(1);
    expect(filterPlans(plans, "", "published")[0].id).toBe("p2");
  });

  it("moves tasks optimistically between planner days", () => {
    const plans: Plan[] = [
      {
        id: "p1",
        planDate: "2026-08-31",
        published: false,
        tasks: [{ id: "t1", type: "study", start: "08:00", end: "09:00" }],
      },
      { id: "p2", planDate: "2026-09-01", published: false, tasks: [] },
    ];
    const moved = optimisticMove(plans, {
      taskId: "t1",
      planId: "p2",
      start: "10:00",
      end: "11:00",
    });
    expect(moved[0].tasks).toHaveLength(0);
    expect(moved[1].tasks[0].start).toBe("10:00");
  });
});
