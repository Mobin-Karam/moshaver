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
    find: jest.fn(async () => items),
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

  it("notifies the active adviser once the planned study limit is reached", async () => {
    const now = new Date();
    const session = {
      id: "session-1",
      student: { id: "student-1", name: "سارا" },
      task: { id: "task-1", title: "ریاضی", duration: 60 },
      status: StudySessionStatus.ACTIVE,
      startedAt: new Date(now.getTime() - 61 * 60_000),
      lastStartedAt: new Date(now.getTime() - 61 * 60_000),
      elapsedSeconds: 0,
    } as any;
    const adviser = { fromUser: { id: "advisor-1" } } as any;
    const notifications = { createForUsers: jest.fn(async () => []) };
    const service = new StudySessionsService(
      repository([session]) as any,
      repository([{ id: "student-1" }]) as any,
      repository() as any,
      repository([adviser]) as any,
      notifications as any,
    );

    await service.heartbeat("user-1", session.id);

    expect(notifications.createForUsers).toHaveBeenCalledWith(["advisor-1"], expect.objectContaining({
      type: "STUDY_OVERTIME",
      title: "رسیدن به سقف زمان مطالعه",
      dedupeKey: "study-overtime:session-1:limit",
      data: expect.objectContaining({ studentId: "student-1", taskId: "task-1", level: "limit", limitSeconds: 3600 }),
    }));
  });

  it("uses a high-priority escalation when study runs much longer than planned", async () => {
    const now = new Date();
    const session = { id: "session-2", student: { id: "student-1", name: "سارا" }, task: { id: "task-2", title: "فیزیک", duration: 40 }, status: StudySessionStatus.ACTIVE, startedAt: new Date(now.getTime() - 61 * 60_000), lastStartedAt: new Date(now.getTime() - 61 * 60_000), elapsedSeconds: 0 } as any;
    const notifications = { createForUsers: jest.fn(async () => []) };
    const service = new StudySessionsService(repository([session]) as any, repository([{ id: "student-1" }]) as any, repository() as any, repository([{ fromUser: { id: "advisor-1" } }]) as any, notifications as any);

    await service.heartbeat("user-1", session.id);

    expect(notifications.createForUsers).toHaveBeenCalledWith(["advisor-1"], expect.objectContaining({ title: "ادامه طولانی جلسه مطالعه", priority: "high", dedupeKey: "study-overtime:session-2:excessive" }));
  });
});
