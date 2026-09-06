import { describe, expect, it } from "vitest";
import { normalizeAttentionStudent } from "./dashboard.api";

describe("normalizeAttentionStudent", () => {
  it("maps the nested API v2 attention contract into the dashboard view model", () => {
    const student = normalizeAttentionStudent({
      id: "student-a",
      name: "Student A",
      presence: { online: false, lastSeenAt: "2026-09-06T10:00:00.000Z" },
      attention: {
        score: 5,
        signals: [
          { type: "MISSED_TASKS", count: 3, weight: 2 },
          { type: "TASK_ISSUE", count: 1, weight: 3 },
        ],
      },
    });

    expect(student).toMatchObject({
      severity: "red",
      remainingTasks: 3,
      lastSeenAt: "2026-09-06T10:00:00.000Z",
      dueReviews: 0,
      recentAccuracy: null,
    });
    expect(student.reasons).toEqual([
      { code: "missed_tasks", label: "فعالیت عقب‌افتاده", value: 3 },
      { code: "task_issue", label: "مسئله فعالیت باز", value: 1 },
    ]);
  });

  it("defaults omitted collections and metrics without crashing", () => {
    expect(normalizeAttentionStudent({ id: "student-b", name: "Student B" })).toMatchObject({
      reasons: [],
      remainingTasks: 0,
      dueReviews: 0,
      recentAccuracy: null,
      severity: "green",
    });
  });
});
