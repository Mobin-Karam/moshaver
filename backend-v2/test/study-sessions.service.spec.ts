import { ApiException } from "../src/common/exceptions/api.exception";
import { StudySessionStatus } from "../src/database/entities/study-session.entity";
import { StudySessionsService } from "../src/modules/study-sessions/study-sessions.service";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id) return items.find((item) => (item as Record<string, unknown>).id === where.id) || null;
      return items.find((item) => {
        const student = where.student as Record<string, unknown> | undefined;
        const status = where.status;
        return (!status || (item as Record<string, unknown>).status === status) && (!student || ((item as Record<string, unknown>).student as Record<string, unknown>)?.id === (student.id || ((student.user as Record<string, unknown>)?.id)));
      }) || null;
    }),
    create: jest.fn((item: T) => item),
    save: jest.fn(async (item: T) => ({ id: "session-1", ...item })),
  };
}

describe("StudySessionsService", () => {
  it("rejects a task that is not owned by the authenticated student", async () => {
    const service = new StudySessionsService(
      repository() as any,
      repository([{ id: "student-1" }]) as any,
      repository() as any,
    );

    await expect(service.start("user-1", "task-1")).rejects.toBeInstanceOf(ApiException);
  });

  it("pauses and resumes an owned session without losing elapsed time", async () => {
    const now = new Date();
    const session = { id: "session-1", student: { id: "student-1" }, status: StudySessionStatus.ACTIVE, startedAt: now, lastStartedAt: now, elapsedSeconds: 12 } as any;
    const sessions = repository([session]);
    const service = new StudySessionsService(sessions as any, repository([{ id: "student-1" }]) as any, repository() as any);

    const paused = await service.pause("user-1", session.id);
    expect(paused.status).toBe(StudySessionStatus.PAUSED);
    expect(paused.elapsedSeconds).toBeGreaterThanOrEqual(12);
    const resumed = await service.resume("user-1", session.id);
    expect(resumed.status).toBe(StudySessionStatus.ACTIVE);
  });
});