import { ApiException } from "../src/common/exceptions/api.exception";
import { MistakesService } from "../src/modules/mistakes/mistakes.service";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async ({ where }: { where: Record<string, any> }) => items.find((item) => {
      const value = item as any;
      return where.user ? value.user?.id === where.user.id : Object.entries(where).every(([key, expected]) => value[key] === expected);
    }) || null),
    find: jest.fn(async () => items),
    save: jest.fn(async (item: T) => item),
  };
}

describe("MistakesService", () => {
  it("scopes list and detail to the authenticated student's record", async () => {
    const mistakes = repository([{ id: "mistake-1", studentId: "student-1", questionId: "question-1", reason: "", resolved: false }]);
    const students = repository([{ id: "student-1", user: { id: "user-1" } }]);
    const service = new MistakesService(mistakes as any, students as any);

    await service.list("user-1", "10");
    await service.detail("user-1", "mistake-1");

    expect(mistakes.find).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "student-1" }, take: 10 }));
    expect(mistakes.findOne).toHaveBeenCalledWith({ where: { id: "mistake-1", studentId: "student-1" } });
  });

  it("rejects updates for another student's mistake", async () => {
    const service = new MistakesService(repository([]) as any, repository([{ id: "student-1", user: { id: "user-1" } }]) as any);
    await expect(service.update("user-1", "mistake-2", { resolved: true })).rejects.toBeInstanceOf(ApiException);
  });
});