import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../shared/api/api";
import {
  createExamQuestion,
  deleteExamQuestion,
  getExamQuestions,
  getQuestionBankExams,
  updateQuestion,
} from "./questions.api";

const draft = {
  question: "دو به علاوه دو؟",
  options: ["۱", "۲", "۳", "۴"],
  correctOption: "d",
  explanation: "جمع ساده",
  book: "ریاضی",
  chapter: "یک",
  lesson: "یک",
  topic: "جمع",
  hint: "بشمارید",
  sortOrder: 1,
};

describe("questions API contract", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads the selector through the questions capability endpoint", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);

    await getQuestionBankExams();
    await getExamQuestions("exam-1");

    expect(get).toHaveBeenNthCalledWith(1, "/question-bank/exams");
    expect(get).toHaveBeenNthCalledWith(2, "/exams/exam-1/questions");
  });

  it("uses canonical question mutation routes", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const remove = vi.spyOn(api, "delete").mockResolvedValue({} as never);

    await createExamQuestion("exam-1", draft);
    await updateQuestion("question-1", draft);
    await deleteExamQuestion("exam-1", "question-1");

    expect(post).toHaveBeenCalledWith("/exams/exam-1/questions", draft);
    expect(patch).toHaveBeenCalledWith("/questions/question-1", draft);
    expect(remove).toHaveBeenCalledWith("/exams/exam-1/questions/question-1");
  });
});
