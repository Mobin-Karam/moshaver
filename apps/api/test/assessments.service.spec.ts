import { ApiException } from "../src/common/exceptions/api.exception";
import { RetryRequestStatus } from "../src/database/entities/exam-retry-request.entity";
import { AssessmentsService } from "../src/modules/assessments/assessments.service";

function repo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    findOneByOrFail: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: "saved-1", ...value })),
    delete: jest.fn(),
    ...overrides,
  };
}

function service({ used = 0, approved = 0 } = {}) {
  const exam = { id: "exam-1", attemptLimit: 1 };
  const student = { id: "student-1" };
  const retries = repo({
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => approved),
  });
  const result = new AssessmentsService(
    repo({ findOneByOrFail: jest.fn(async () => exam) }) as any,
    repo({ findOne: jest.fn(async () => ({ id: "assignment-1" })) }) as any,
    repo() as any,
    repo() as any,
    retries as any,
    repo() as any,
    repo() as any,
    repo() as any,
    repo({ findOneOrFail: jest.fn(async () => student) }) as any,
    repo({ count: jest.fn(async () => used) }) as any,
    {} as any,
    {} as any,
  );
  return { result, retries, exam };
}

describe("AssessmentsService retry isolation", () => {
  it("rejects a retry request while the student still has an available attempt", async () => {
    const { result, retries } = service({ used: 0 });

    const failure = await result.requestRetry("user-1", "exam-1", "reason").catch((error: ApiException) => error);
    expect(failure).toBeInstanceOf(ApiException);
    expect((failure as ApiException).getResponse()).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: "ATTEMPTS_AVAILABLE" }),
    }));
    expect(retries.save).not.toHaveBeenCalled();
  });

  it("accepts a request after base and previously approved attempts are consumed", async () => {
    const { result, retries, exam } = service({ used: 2, approved: 1 });

    const created = await result.requestRetry("user-1", "exam-1", "قطع اینترنت");

    expect(retries.save).toHaveBeenCalledWith(expect.objectContaining({ exam, message: "قطع اینترنت" }));
    expect(created).toEqual(expect.objectContaining({ id: "saved-1", message: "قطع اینترنت" }));
  });

  it("does not mutate the global exam attempt limit when approving one request", async () => {
    const { result, retries, exam } = service({ used: 1 });
    const row = { id: "retry-1", exam, student: { id: "student-1" }, status: RetryRequestStatus.PENDING };
    retries.findOne.mockResolvedValue(row);
    const manager = { findOneByOrFail: jest.fn(async () => ({ id: "admin-1" })), save: jest.fn(async (_entity, value) => value) };
    (result as any).authz = { canAccessStudent: jest.fn(async () => true) };
    (result as any).db = { manager, transaction: jest.fn(async (work) => work(manager)) };

    await result.moderateRetry({ roles: [], capabilities: [], organizationIds: [], membershipIds: [] } as any, "admin-1", "retry-1", { status: RetryRequestStatus.APPROVED });

    expect(exam.attemptLimit).toBe(1);
    expect(manager.save).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ status: RetryRequestStatus.APPROVED }));
  });
});

describe("AssessmentsService student quiz isolation", () => {
  function quizService() {
    const quizzes = repo({
      find: jest.fn(async () => [
        { id: "quiz-assigned", title: "Assigned", subject: "Math", durationMinutes: 10, active: true, questions: [{ id: "q1", correctAnswer: "A" }], exam: { id: "exam-1" }, organization: null },
        { id: "quiz-org", title: "Organization", subject: "Physics", durationMinutes: 15, active: true, questions: [], exam: null, organization: { id: "org-1" } },
        { id: "quiz-other", title: "Other", subject: "Chemistry", durationMinutes: 20, active: true, questions: [], exam: null, organization: { id: "org-2" } },
      ]),
    });
    const assignments = repo({
      findOne: jest.fn(async ({ where }: any) => where.exam?.id === "exam-1" ? { id: "assignment-1" } : null),
    });
    const manager = {
      findOne: jest.fn(async (_entity: unknown, { where }: any) => where.organization?.id === "org-1" ? { id: "membership-1" } : null),
    };
    const result = new AssessmentsService(
      repo() as any,
      assignments as any,
      repo() as any,
      repo() as any,
      repo() as any,
      quizzes as any,
      repo() as any,
      repo({ findOne: jest.fn(async () => null) }) as any,
      repo({ findOneOrFail: jest.fn(async () => ({ id: "student-1", user: { id: "user-1" } })) }) as any,
      repo() as any,
      {} as any,
      { manager } as any,
    );
    return { result, quizzes };
  }

  it("lists only exam-assigned or same-organization active quizzes", async () => {
    const { result } = quizService();

    const visible = await result.studentQuizzes("user-1");

    expect(visible.map((quiz) => quiz.id)).toEqual(["quiz-assigned", "quiz-org"]);
    expect(visible[0]).toEqual(expect.objectContaining({ questionCount: 1, attempt: null }));
    expect(visible[0]).not.toHaveProperty("questions");
  });

  it("returns not found rather than exposing a cross-organization standalone quiz", async () => {
    const { result, quizzes } = quizService();
    quizzes.findOne.mockResolvedValue({ id: "quiz-other", active: true, exam: null, organization: { id: "org-2" } });

    const failure = await result.studentQuiz("user-1", "quiz-other").catch((error: ApiException) => error);

    expect(failure).toBeInstanceOf(ApiException);
    expect((failure as ApiException).getStatus()).toBe(404);
  });
});

describe("AssessmentsService quiz answer compatibility", () => {
  function submissionService(correctAnswer: string) {
    const question = { id: "question-1", options: ["الف", "ب", "ج", "د"], correctAnswer, explanation: "" };
    const run = {
      id: "run-1",
      startedAt: new Date(),
      submittedAt: null,
      answers: [],
      quiz: { id: "quiz-1", durationMinutes: 10, questions: [question] },
    };
    const attempts = repo({ findOne: jest.fn(async () => run) });
    const manager = {
      save: jest.fn(async (_entity: unknown, value: unknown) => value),
      findOne: jest.fn(async () => null),
      create: jest.fn((_entity: unknown, value: unknown) => value),
    };
    const result = new AssessmentsService(
      repo() as any, repo() as any, repo() as any, repo() as any, repo() as any,
      repo() as any, repo() as any, attempts as any,
      repo({ findOneOrFail: jest.fn(async () => ({ id: "student-1" })) }) as any,
      repo() as any, {} as any,
      { transaction: jest.fn(async (work) => work(manager)) } as any,
    );
    return { result, run };
  }

  it.each([
    ["a", "a"],
    ["الف", "a"],
  ])("scores canonical and legacy correct answers (%s)", async (correctAnswer, selectedOption) => {
    const { result } = submissionService(correctAnswer);

    const submitted = await result.submitQuiz("user-1", "quiz-1", {
      runId: "run-1",
      answers: [{ questionId: "question-1", selectedOption }],
    });

    expect(submitted).toEqual(expect.objectContaining({ correct: 1, wrong: 0, percent: 100 }));
    expect(submitted.review).toEqual([
      expect.objectContaining({ selectedOption: "a", correctOption: "a", isCorrect: true }),
    ]);
  });

  it("never awards a point when a legacy question has an invalid answer key", async () => {
    const { result } = submissionService("unknown");

    const submitted = await result.submitQuiz("user-1", "quiz-1", {
      runId: "run-1",
      answers: [{ questionId: "question-1", selectedOption: "unknown" }],
    });

    expect(submitted).toEqual(expect.objectContaining({ correct: 0, wrong: 1, percent: 0 }));
  });

  it("accepts a canonical key when an admin writes a quiz question and stores the option value", async () => {
    const questions = repo();
    const quizzes = repo({ findOne: jest.fn(async () => ({ id: "quiz-1", organization: { id: "org-1" } })) });
    const result = new AssessmentsService(
      repo() as any, repo() as any, repo() as any, repo() as any, repo() as any,
      quizzes as any, questions as any, repo() as any, repo() as any, repo() as any,
      { canAccessOrganization: jest.fn(() => true) } as any, {} as any,
    );

    await result.addQuizQuestion(
      { roles: [], capabilities: ["quiz_questions.manage"], organizationIds: ["org-1"], membershipIds: [] } as any,
      "quiz-1",
      { text: "پاسخ؟", options: ["الف", "ب", "ج", "د"], correctAnswer: "b" },
    );

    expect(questions.save).toHaveBeenCalledWith(expect.objectContaining({ correctAnswer: "ب" }));
  });
});
