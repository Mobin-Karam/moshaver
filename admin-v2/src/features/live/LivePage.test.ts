import { describe, expect, it } from "vitest";
import {
  filterLiveStudents,
  needsAttention,
  type LiveStudent,
} from "./LivePage";

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
    expect(filterLiveStudents(students, "سارا", "all")).toEqual([
      students[0],
    ]);

    expect(
      filterLiveStudents(students, "برنامه امروز", "all"),
    ).toEqual([students[0]]);
  });

  it("normalizes online and attention filters", () => {
    expect(filterLiveStudents(students, "", "online")).toEqual([
      students[0],
    ]);

    expect(
      filterLiveStudents(students, "", "attention"),
    ).toEqual([students[1]]);

    expect(needsAttention(students[1])).toBe(true);
  });
});
