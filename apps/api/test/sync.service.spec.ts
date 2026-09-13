import { ApiException } from "../src/common/exceptions/api.exception";
import { SyncService } from "../src/modules/sync/sync.service";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async () => items[0] || null),
    find: jest.fn(async () => items),
    create: jest.fn((item: T) => item),
    save: jest.fn(async (item: T) => item),
  };
}

describe("SyncService", () => {
  it("pulls only the authenticated student's supported data", async () => {
    const student = { id: "student-1" };
    const plans = repository([{ id: "plan-1", tasks: [{ id: "task-1" }] }]);
    const sessions = repository([{ id: "session-1" }]);
    const attempts = repository([{ id: "attempt-1" }]);
    const notifications = repository([{ id: "notification-1" }]);
    const service = new SyncService(
      repository([student]) as any,
      plans as any,
      sessions as any,
      attempts as any,
      notifications as any,
      repository() as any,
      {} as any,
      {} as any,
    );

    const result = await service.pull({ id: "user-1" } as any);

    expect(result.plans).toEqual([{ id: "plan-1", tasks: [{ id: "task-1" }] }]);
    expect(result.tasks).toEqual([{ id: "task-1" }]);
    expect(result.unsupported).toContain("messages");
    expect(plans.find).toHaveBeenCalledWith(expect.objectContaining({ where: { student: { id: student.id } } }));
  });

  it("queries learning items through the TypeORM student relation", async () => {
    const learning = repository([{ id: "learning-1" }]);
    const service = new SyncService(
      repository([{ id: "student-1" }]) as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      {} as any,
      {} as any,
      repository() as any,
      repository() as any,
      repository() as any,
      learning as any,
    );

    await service.pull({ id: "user-1" } as any);

    expect(learning.find).toHaveBeenCalledWith(expect.objectContaining({ where: { student: { id: "student-1" } } }));
  });

  it("dispatches owned task completion and records a replayable receipt", async () => {
    const mutations = repository();
    const tasks = { complete: jest.fn(async () => ({ id: "task-1", status: "done" })) };
    const service = new SyncService(
      repository([{ id: "student-1" }]) as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      mutations as any,
      tasks as any,
      {} as any,
    );
    const change = { id: "mutation-1", method: "POST" as const, path: "/student/tasks/task-1/complete", body: { status: "done" } };

    const first = await service.upload({ id: "user-1" } as any, [change]);
    mutations.findOne.mockResolvedValue({ result: { id: "task-1", status: "done" } });
    const second = await service.upload({ id: "user-1" } as any, [change]);

    expect(tasks.complete).toHaveBeenCalledTimes(1);
    expect(first.acceptedCount).toBe(1);
    expect(second.accepted[0]).toMatchObject({ id: change.id, replayed: true });
    expect(mutations.save).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported routes and invalid mutation bodies", async () => {
    const service = new SyncService(
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      {} as any,
      {} as any,
    );

    const result = await service.upload({ id: "user-1" } as any, [
      { id: "unsupported", method: "POST", path: "/messages", body: {} },
      { id: "invalid", method: "POST", path: "/student/study-sessions", body: {} },
    ]);

    expect(result.rejectedCount).toBe(2);
    expect(result.rejected.map((item) => item.code)).toEqual(["SYNC_UNSUPPORTED_MUTATION", "SYNC_INVALID_BODY"]);
  });

  it("rejects an invalid pull cursor", async () => {
    const service = new SyncService(
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      repository() as any,
      {} as any,
      {} as any,
    );

    await expect(service.pull({ id: "user-1" } as any, "not-a-date")).rejects.toBeInstanceOf(ApiException);
  });
});
