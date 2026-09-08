import { describe, expect, it } from "vitest";
import { buildAdvisorInboxRows, issueTypeLabel } from "./lib/notification-utils";

describe("advisor inbox normalization", () => {
  it("keeps task issues and recovery requests actionable", () => {
    const rows = buildAdvisorInboxRows({
      issues: [{ id: "issue-1", issue_type: "time", status: "open" }],
      recoveryRequests: [{ id: "recovery-1", plan_date: "2026-09-03", status: "pending" }],
      missedTasks: [{ id: "task-1", title: "درس" }],
    });

    expect(rows.map((row) => [row.kind, row.actionable])).toEqual([
      ["issue", true],
      ["recovery", true],
      ["missed", false],
    ]);
    expect(rows.map((row) => row.key)).toEqual([
      "issue:issue-1",
      "recovery:recovery-1",
      "missed:task-1",
    ]);
  });

  it("maps common issue types to useful Persian labels", () => {
    expect(issueTypeLabel({ id: "1", issue_type: "time" })).toBe("کمبود زمان");
    expect(issueTypeLabel({ id: "2", issueType: "unclear" })).toBe("ابهام در فعالیت");
  });
});
