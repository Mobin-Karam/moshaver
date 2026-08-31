import { describe, expect, it } from "vitest";
import { examDraftError, examReadiness, makeExamDraft, matchesExam } from "./exam-model";

describe("exam UI model", () => {
  it("rejects reversed schedules and invalid attempt limits", () => {
    const draft = makeExamDraft();
    expect(examDraftError({ ...draft, title: "آزمون", persianDate: "۱۴۰۵/۰۶/۱۰", closeAt: draft.openAt })).toContain("پایان");
    expect(examDraftError({ ...draft, title: "آزمون", persianDate: "۱۴۰۵/۰۶/۱۰", maxAttempts: 0 })).toContain("تلاش");
  });
  it("normalizes Persian search and reports unsafe publication", () => {
    const exam = { id: "e", title: "علي", isoDate: "2026-01-01", published: true, delivery: { questionCount: 0 } };
    expect(matchesExam(exam, "علی", "all", "all")).toBe(true);
    expect(examReadiness(exam).label).toContain("بدون سؤال");
  });
});
