import { StudentsService } from "../src/modules/students/students.service";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async () => items[0] || null),
    find: jest.fn(async () => items),
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
});
