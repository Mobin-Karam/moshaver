import { describe, expect, it } from "vitest";
import { normalizeLiveSnapshot } from "./api/live.api";
import { filterLiveStudents, needsAttention, type LiveStudent } from "./LivePage";

const students: LiveStudent[] = [
  {
    id: "one",
    name: "سارا محمدی",
    grade: "دوازدهم",
    state: "studying",
    freshness: "live",
    presence: { online: true },
    currentView: "برنامه امروز",
    dueReviews: 1,
    remainingTasks: 2,
    lastExamPercent: 82,
  },
  {
    id: "two",
    name: "علی رضایی",
    major: "ریاضی",
    state: "offline",
    freshness: "offline",
    presence: { online: false },
    dueReviews: 4,
    remainingTasks: 5,
    lastExamPercent: 42,
  },
];

describe("live operations console", () => {
  it("searches across identity and current activity", () => {
    expect(filterLiveStudents(students, "سارا", "all")).toEqual([students[0]]);

    expect(filterLiveStudents(students, "برنامه امروز", "all")).toEqual([students[0]]);
  });

  it("normalizes online and attention filters", () => {
    expect(filterLiveStudents(students, "", "online")).toEqual([students[0]]);

    expect(filterLiveStudents(students, "", "attention")).toEqual([students[1]]);

    expect(needsAttention(students[1])).toBe(true);
  });

  it("adapts the backend live array into the page snapshot without inventing metrics", () => {
    const snapshot = normalizeLiveSnapshot([
      {
        id: "student-1",
        name: "آرمان رضایی",
        presence: {
          online: true,
          state: "studying",
          lastSeenAt: new Date().toISOString(),
          currentTask: { id: "task-1", title: "مطالعه زیست" },
        },
        attention: {
          score: 5,
          signals: [
            { type: "MISSED_TASKS", count: 2, weight: 2 },
            { type: "TASK_ISSUE", count: 1, weight: 3 },
          ],
        },
      },
    ]);

    expect(snapshot.summary).toMatchObject({ total: 1, online: 1, studying: 1, attention: 1 });
    expect(snapshot.students?.[0]).toMatchObject({
      state: "studying",
      remainingTasks: 2,
      dueReviews: 0,
      lastExamPercent: null,
      attentionScore: 5,
    });
  });
});
