import { StudentsService } from "../src/modules/students/students.service";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async () => items[0] || null),
    find: jest.fn(async () => items),
    save: jest.fn(async (value) => value),
  };
}

describe("StudentsService parity projections", () => {
  it("summarizes published task completion across the last seven days", async () => {
    const plans = [{ date: new Date().toISOString().slice(0, 10), status: "PUBLISHED", tasks: [{ completedAt: new Date() }, { completedAt: null }] }];
    const service = new StudentsService(repository([{ id: "student-1", plans }]) as any, repository() as any, repository() as any, repository() as any, repository() as any, repository() as any);

    const result = await service.progress("user-1");

    expect(result).toMatchObject({ studentId: "student-1", completed: 1, total: 2, percent: 50 });
    expect(result.days).toHaveLength(1);
  });

  it("returns topic mastery as supported learning data", async () => {
    const mastery = repository([{ topic: "algebra", score: 60 }, { topic: "geometry", score: 80 }]);
    const service = new StudentsService(repository([{ id: "student-1", plans: [] }]) as any, repository() as any, mastery as any, repository() as any, repository() as any, repository() as any);

    await expect(service.learning("user-1")).resolves.toMatchObject({ studentId: "student-1", summary: { total: 2, averageScore: 70 }, items: [{ topic: "algebra", score: 60 }, { topic: "geometry", score: 80 }] });
  });

  it("keeps guardian chat visibility off until the student explicitly enables it", async () => {
    const students = repository([{ id: "student-1", guardianChatReadOnly: false }]);
    const service = new StudentsService(students as any, repository() as any, repository() as any, repository() as any, repository() as any, repository() as any);
    await expect(service.chatPrivacy("student-user")).resolves.toEqual({ guardianReadOnly: false });
    await expect(service.updateChatPrivacy("student-user", true)).resolves.toEqual({ guardianReadOnly: true });
    expect(students.save).toHaveBeenCalledWith(expect.objectContaining({ guardianChatReadOnly: true }));
  });

  it("rejects non-boolean privacy values", async () => {
    const service = new StudentsService(repository([{ id: "student-1" }]) as any, repository() as any, repository() as any, repository() as any, repository() as any, repository() as any);
    await expect(service.updateChatPrivacy("student-user", "true")).rejects.toMatchObject({
      response: { error: expect.objectContaining({ code: "INVALID_PRIVACY_VALUE" }) },
    });
  });
});
