import { describe, expect, it } from "vitest";
import { emptyQuestion, questionError, questionMatches, questionNumber, questionPayload } from "./question-model";

describe("question model", () => {
  it("rejects duplicate normalized Persian options", () => {
    expect(questionError({ ...emptyQuestion(), question: "نمونه؟", options: ["علي", "علی", "سه", "چهار"] })).toContain("تکراری");
  });
  it("searches normalized metadata", () => {
    expect(questionMatches({ question: "سوال", topic: "علي" }, "علی")).toBe(true);
  });
  it("normalizes the API payload and validates sort order", () => {
    const draft = { ...emptyQuestion(), question: "  نمونه؟ ", options: [" یک ", "دو", "سه", "چهار"], explanation: " توضیح ", sortOrder: 0 };
    expect(questionError(draft)).toContain("ترتیب");
    expect(questionPayload({ ...draft, sortOrder: 2 })).toMatchObject({ question: "نمونه؟", options: ["یک", "دو", "سه", "چهار"], explanation: "توضیح" });
    expect(questionNumber({ sort_order: 7 }, 1)).toBe(7);
  });
});
