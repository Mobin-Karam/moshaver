import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../shared/api/api";
import { createQuizQuestion, getQuizQuestions, updateQuizQuestion } from "./quizzes.api";

const editorDraft = {
  question: "دو به علاوه دو؟",
  options: ["۱", "۲", "۳", "۴"],
  correctOption: "d",
  explanation: "جمع ساده",
  book: "ریاضی",
  chapter: "یک",
  lesson: "یک",
  topic: "جمع",
  hint: "بشمارید",
  sortOrder: 2,
};

describe("quiz question API adapter", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("maps the canonical response answer value to the editor option key", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      {
        id: "question-1",
        text: "دو به علاوه دو؟",
        options: ["۱", "۲", "۳", "۴"],
        correctAnswer: "۴",
        explanation: "جمع ساده",
        sortOrder: 2,
      },
    ] as never);

    await expect(getQuizQuestions("quiz-1")).resolves.toEqual([
      expect.objectContaining({
        id: "question-1",
        question: "دو به علاوه دو؟",
        correctOption: "d",
      }),
    ]);
  });

  it("sends only quiz DTO fields and converts the answer key to its value", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const expected = {
      text: "دو به علاوه دو؟",
      options: ["۱", "۲", "۳", "۴"],
      correctAnswer: "۴",
      explanation: "جمع ساده",
      sortOrder: 2,
    };

    await createQuizQuestion("quiz-1", editorDraft);
    await updateQuizQuestion("question-1", editorDraft);

    expect(post).toHaveBeenCalledWith("/quizzes/quiz-1/questions", expected);
    expect(patch).toHaveBeenCalledWith("/quiz-questions/question-1", expected);
  });
});
