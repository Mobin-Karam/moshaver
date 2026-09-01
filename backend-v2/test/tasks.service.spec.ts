import { ApiException } from "../src/common/exceptions/api.exception";
import { TaskCompletionStatus } from "../src/modules/tasks/dto/complete-task.dto";
import { TasksService } from "../src/modules/tasks/tasks.service";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id) return items.find((item) => (item as Record<string, unknown>).id === where.id) || null;
      return items[0] || null;
    }),
    find: jest.fn(async () => items),
    create: jest.fn((item: T) => item),
    save: jest.fn(async (item: T) => item),
  };
}

describe("TasksService", () => {
  it("rejects task detail for another student", async () => {
    const service = new TasksService(
      repository() as any,
      repository([{ id: "student-1" }]) as any,
      repository() as any,
      repository() as any,
    );

    await expect(service.detail("user-1", "task-1")).rejects.toBeInstanceOf(ApiException);
  });

  it("completes an owned task and maps optional completion feedback", async () => {
    const task = { id: "task-1", plan: { student: { id: "student-1" } }, status: "PLANNED", note: "old" } as any;
    const tasks = repository([task]);
    const service = new TasksService(
      tasks as any,
      repository([{ id: "student-1" }]) as any,
      repository() as any,
      repository() as any,
    );

    const result = await service.complete("user-1", task.id, {
      status: TaskCompletionStatus.PARTIAL,
      actualTests: 12,
      difficulty: "hard",
      note: "review needed",
    });

    expect(result).toMatchObject({ id: task.id, status: TaskCompletionStatus.PARTIAL, actualTests: 12, difficulty: "hard", note: "review needed" });
    expect(task.completedAt).toBeInstanceOf(Date);
    expect(tasks.save).toHaveBeenCalledWith(task);
  });

  it("creates comments and issues only for the owned task", async () => {
    const task = { id: "task-1", plan: { student: { id: "student-1" } } } as any;
    const comments = repository() as any;
    const issues = repository() as any;
    const service = new TasksService(
      repository([task]) as any,
      repository([{ id: "student-1" }]) as any,
      comments,
      issues,
    );

    await service.addComment("user-1", task.id, { text: "  note  " });
    await service.reportIssue("user-1", task.id, { type: "MISSING", description: "  details  " });

    expect(comments.create).toHaveBeenCalledWith(expect.objectContaining({ text: "note", task, student: { id: "student-1" } }));
    expect(issues.create).toHaveBeenCalledWith(expect.objectContaining({ type: "MISSING", description: "details", status: "OPEN", task, student: { id: "student-1" } }));
  });
});