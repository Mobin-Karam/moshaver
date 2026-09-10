import { ApiException } from "../src/common/exceptions/api.exception";
import { ExamsService } from "../src/modules/exams/exams.service";

function repository<T>(items: T[] = []) {
  return {
    findOneOrFail: jest.fn(async ({ where }: { where: Record<string, any> }) => {
      const item = items.find((candidate) => {
        const value = candidate as any;
        return (!where.id || value.id === where.id) && (!where.student || value.id === where.student.id || value.student?.id === where.student.id);
      });
      if (!item) throw new Error("not found");
      return item;
    }),
    findOne: jest.fn(async () => items[0] || null),
    find: jest.fn(async () => items),
    count: jest.fn(async () => items.length),
    create: jest.fn((value: T) => value),
    save: jest.fn(async (value: T) => ({ id: "attempt-1", ...value })),
    update: jest.fn(async () => undefined),
  };
}

describe("ExamsService student attempt safety", () => {
  it("does not leak answer keys or explanations from student exam detail", async () => {
    const exam = { id: "exam-1", title: "Secure", published: true, lifecycleStatus: "scheduled", duration: 60, attemptLimit: 1, startTime: new Date(Date.now() - 60_000), endTime: new Date(Date.now() + 60_000), questions: [{ id: "q1", text: "Secret question", options: ["A", "B", "C", "D"], correctAnswer: "b", explanation: "Secret explanation", subject: "زیست" }], attempts: [] } as any;
    const service = new ExamsService(repository([exam]) as any, repository() as any, repository() as any, repository([{ id: "student-1" }]) as any);
    const detail = await service.detail("exam-1", "user-1");
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain("correctAnswer");
    expect(serialized).not.toContain("correctOption");
    expect(serialized).not.toContain("Secret explanation");
    expect(serialized).not.toContain("isCorrect");
  });

  it("saves only owned question answers and returns them on resume", async () => {
    const attempt = { id: "attempt-1", student: { id: "student-1" }, startedAt: new Date(), answers: [], finishedAt: null, exam: { id: "exam-1", duration: 60, questions: [{ id: "question-1", text: "Q", options: ["A"], correctAnswer: "A", explanation: "" }] } } as any;
    const attempts = repository([attempt]);
    const service = new ExamsService(repository() as any, repository() as any, attempts as any, repository([{ id: "student-1" }]) as any);

    const progress = await service.saveProgress("attempt-1", [{ questionId: "question-1", selectedOption: "a" }], "user-1");

    expect(attempts.update).toHaveBeenCalledWith("attempt-1", {
      answers: [
        expect.objectContaining({
          questionId: "question-1",
          selectedOption: "a",
          revision: 1,
        }),
      ],
    });
    expect(progress.savedAnswers).toEqual([
      expect.objectContaining({
        questionId: "question-1",
        selectedOption: "a",
        revision: 1,
      }),
    ]);
  });

  it("rejects an answer for a question outside the attempt exam", async () => {
    const attempt = { id: "attempt-1", student: { id: "student-1" }, startedAt: new Date(), answers: [], finishedAt: null, exam: { id: "exam-1", duration: 60, questions: [{ id: "question-1" }] } } as any;
    const service = new ExamsService(repository() as any, repository() as any, repository([attempt]) as any, repository([{ id: "student-1" }]) as any);
    await expect(service.saveProgress("attempt-1", [{ questionId: "foreign-question", selectedOption: "a" }], "user-1")).rejects.toMatchObject({ response: { error: { code: "QUESTION_NOT_IN_EXAM" } } });
  });

  it("rejects an attempt that is not owned by the authenticated student", async () => {
    const attempts = repository([]);
    const service = new ExamsService(repository() as any, repository() as any, attempts as any, repository([{ id: "student-2" }]) as any);

    await expect(service.submit("attempt-1", [], "user-2")).rejects.toBeInstanceOf(Error);
    expect(attempts.update).not.toHaveBeenCalled();
  });

  it("rejects a new attempt after the student reaches the limit", async () => {
    const exam = { id: "exam-1", attemptLimit: 1, duration: 60, questions: [] } as any;
    const attempts = { findOne: jest.fn(async () => null), count: jest.fn(async () => 1) };
    const service = new ExamsService(repository([exam]) as any, repository() as any, attempts as any, repository([{ id: "student-1" }]) as any);

    await expect(service.start("exam-1", "user-1")).rejects.toBeInstanceOf(ApiException);
  });

  it("rejects starting an assigned exam before its legal window", async () => {
    const exam = {
      id: "exam-1",
      published: true,
      attemptLimit: 1,
      duration: 60,
      startTime: new Date(Date.now() + 60_000),
      questions: [{ id: "question-1" }],
    } as any;
    const attempts = { findOne: jest.fn(async () => null), count: jest.fn(async () => 0) };
    const service = new ExamsService(
      repository([exam]) as any,
      repository() as any,
      attempts as any,
      repository([{ id: "student-1" }]) as any,
    );

    try {
      await service.start("exam-1", "user-1");
      throw new Error("expected EXAM_NOT_OPEN");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getResponse()).toMatchObject({
        error: { code: "EXAM_NOT_OPEN" },
      });
    }
  });

  it("does not let an older autosave overwrite a newer server answer", async () => {
    const newer = {
      questionId: "question-1",
      selectedOption: "b",
      clientUpdatedAt: "2026-09-06T09:00:00.000Z",
      revision: 3,
    };
    const attempt = {
      id: "attempt-1",
      student: { id: "student-1" },
      startedAt: new Date(),
      answers: [newer],
      finishedAt: null,
      exam: {
        id: "exam-1",
        duration: 60,
        questions: [{ id: "question-1", text: "Q", options: ["A"], correctAnswer: "a" }],
      },
    } as any;
    const attempts = repository([attempt]);
    const service = new ExamsService(
      repository() as any,
      repository() as any,
      attempts as any,
      repository([{ id: "student-1" }]) as any,
    );

    await service.saveProgress(
      "attempt-1",
      [
        {
          questionId: "question-1",
          selectedOption: "a",
          clientUpdatedAt: "2026-09-06T08:00:00.000Z",
          revision: 2,
        },
      ],
      "user-1",
    );

    expect(attempts.update).toHaveBeenCalledWith("attempt-1", { answers: [newer] });
  });

  it("rejects changing an earlier answer after a later question was visited when back navigation is disabled", async () => {
    const attempt = {
      id: "attempt-1",
      student: { id: "student-1" },
      startedAt: new Date(),
      finishedAt: null,
      answers: [
        { questionId: "q1", selectedOption: "a", visited: true, revision: 1, clientUpdatedAt: "2026-09-06T08:00:00Z" },
        { questionId: "q2", selectedOption: null, visited: true, revision: 1, clientUpdatedAt: "2026-09-06T08:01:00Z" },
      ],
      exam: { id: "exam-1", duration: 60, allowBackNavigation: false, questions: [{ id: "q1" }, { id: "q2" }] },
    } as any;
    const service = new ExamsService(repository() as any, repository() as any, repository([attempt]) as any, repository([{ id: "student-1" }]) as any);

    await expect(service.saveProgress("attempt-1", [
      { questionId: "q1", selectedOption: "b", visited: true, revision: 2, clientUpdatedAt: "2026-09-06T08:02:00Z" },
    ], "user-1")).rejects.toMatchObject({ response: { error: { code: "BACK_NAVIGATION_FORBIDDEN" } } });
  });

  it("withholds score and answer key until the configured release policy allows it", async () => {
    const attempt = {
      id: "attempt-1",
      student: { id: "student-1" },
      startedAt: new Date(),
      answers: [],
      finishedAt: null,
      exam: {
        id: "exam-1",
        duration: 60,
        endTime: null,
        resultPolicy: "manual",
        resultsReleased: false,
        scoring: { correct: 3, wrong: -1, unanswered: 0, negativeMarking: true },
        questions: [
          { id: "q1", text: "Q1", options: ["A"], correctAnswer: "a" },
          { id: "q2", text: "Q2", options: ["B"], correctAnswer: "b" },
        ],
      },
    } as any;
    const attempts = repository([attempt]);
    const service = new ExamsService(
      repository() as any,
      repository() as any,
      attempts as any,
      repository([{ id: "student-1" }]) as any,
    );

    const result = await service.submit(
      "attempt-1",
      [
        { questionId: "q1", selectedOption: "a" },
        { questionId: "q2", selectedOption: "a" },
      ],
      "user-1",
    );

    expect(result).toMatchObject({ status: "withheld", score: null, total: 2 });
    expect(result.review).toBeUndefined();
    expect(attempts.update).toHaveBeenCalledWith(
      "attempt-1",
      expect.objectContaining({ score: 33 }),
    );
  });
});
