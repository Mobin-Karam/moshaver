import { describe, expect, it } from "vitest";
import type { Exam } from "../../../shared/types/domain";
import { educationMetrics, subjectDistribution } from "./education-overview";

describe("education overview", () => {
  const exams: Exam[] = [
    {
      id: "1",
      title: "ریاضی",
      isoDate: "2026-09-13",
      status: "scheduled",
      published: true,
      subject: "ریاضی",
      delivery: { questionCount: 20, activeAttemptCount: 2, completedAttemptCount: 3 },
    },
    {
      id: "2",
      title: "فیزیک",
      isoDate: "2026-09-14",
      status: "draft",
      published: false,
      subjects: ["فیزیک", "ریاضی"],
      delivery: { questionCount: 10 },
    },
  ];

  it("derives operational counts from scoped API data", () => {
    const metrics = educationMetrics(
      exams,
      [{ id: "r1", status: "pending" }],
      new Date(2026, 8, 13),
    );
    expect(Object.fromEntries(metrics.map((item) => [item.key, item.value]))).toMatchObject({
      today: 1,
      upcoming: 1,
      draft: 1,
      published: 1,
      active: 2,
      completed: 3,
      retries: 1,
      questions: 30,
    });
  });

  it("deduplicates and orders subject distribution", () => {
    expect(subjectDistribution(exams)).toEqual([
      { subject: "ریاضی", count: 2 },
      { subject: "فیزیک", count: 1 },
    ]);
  });
});
