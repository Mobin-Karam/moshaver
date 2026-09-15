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
