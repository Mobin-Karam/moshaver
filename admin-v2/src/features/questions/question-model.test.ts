import { describe, expect, it } from "vitest";
import { emptyQuestion, questionError, questionMatches } from "./question-model";

describe("question model", () => {
  it("rejects duplicate normalized Persian options", () => {
    expect(questionError({ ...emptyQuestion(), question: "نمونه؟", options: ["علي", "علی", "سه", "چهار"] })).toContain("تکراری");
  });
  it("searches normalized metadata", () => {
    expect(questionMatches({ question: "سوال", topic: "علي" }, "علی")).toBe(true);
  });
});
