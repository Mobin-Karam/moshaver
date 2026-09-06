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
  it("saves only owned question answers and returns them on resume", async () => {
    const attempt = { id: "attempt-1", student: { id: "student-1" }, startedAt: new Date(), answers: [], finishedAt: null, exam: { id: "exam-1", duration: 60, questions: [{ id: "question-1", text: "Q", options: ["A"], correctAnswer: "A", explanation: "" }] } } as any;
    const attempts = repository([attempt]);
    const service = new ExamsService(repository() as any, repository() as any, attempts as any, repository([{ id: "student-1" }]) as any);

    const progress = await service.saveProgress("attempt-1", [{ questionId: "question-1", selectedOption: "A" }, { questionId: "unknown", selectedOption: "A" }], "user-1");

    expect(attempts.update).toHaveBeenCalledWith("attempt-1", {
      answers: [
        expect.objectContaining({
          questionId: "question-1",
          selectedOption: "A",
          revision: 1,
        }),
      ],
    });
    expect(progress.savedAnswers).toEqual([
      expect.objectContaining({
        questionId: "question-1",
        selectedOption: "A",
        revision: 1,
      }),
    ]);
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
});
