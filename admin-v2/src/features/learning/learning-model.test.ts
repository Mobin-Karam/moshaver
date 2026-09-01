import { describe, expect, it } from "vitest";
import { isLearningDue, learningStatusLabel, type LearningItem } from "./learning-model";

const item = { status: "pending", dueDate: "2026-09-01" } as LearningItem;
describe("learning model", () => {
  it("detects due items without treating completed work as due", () => {
    expect(isLearningDue(item, "2026-09-01")).toBe(true);
    expect(isLearningDue({ ...item, status: "done" }, "2026-09-02")).toBe(false);
  });
  it("provides Persian status labels", () => expect(learningStatusLabel("archived")).toBe("بایگانی"));
});
