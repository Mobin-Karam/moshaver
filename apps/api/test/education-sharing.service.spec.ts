import { EducationSharingService } from "../src/modules/education-sharing/education-sharing.service";

const actor = { id: "user-a", role: "STUDENT", roles: ["STUDENT"], capabilities: ["education.share"] } as never;

function repository(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: "saved", ...value })),
    delete: jest.fn(),
    ...overrides,
  } as never;
}

describe("EducationSharingService", () => {
  it("only exposes active peer students from a shared organization", async () => {
    const source = { id: "student-a", accountStatus: "active", user: { id: "user-a" } };
    const students = repository({ findOne: jest.fn().mockResolvedValue(source) });
    const memberships = repository({
      find: jest
        .fn()
        .mockResolvedValueOnce([{ organization: { id: "org-a" } }])
        .mockResolvedValueOnce([
          { organization: { id: "org-a", name: "Private" }, user: { student: source } },
          { organization: { id: "org-a", name: "Private" }, user: { student: { id: "student-b", name: "B", grade: "12", accountStatus: "active" } } },
          { organization: { id: "org-a", name: "Private" }, user: { student: { id: "student-c", name: "C", grade: "11", accountStatus: "inactive" } } },
        ]),
    });
    const service = new EducationSharingService(students, memberships, repository(), repository(), repository(), repository(), {} as never);
    await expect(service.peers(actor)).resolves.toEqual([{ id: "student-b", name: "B", grade: "12", organizationName: "Private" }]);
  });

  it("copies a plan for a same-organization peer and resets task progress", async () => {
    const sourceStudent = { id: "student-a", accountStatus: "active", user: { id: "user-a" } };
    const targetStudent = { id: "student-b", accountStatus: "active", user: { id: "user-b" } };
    const students = repository({ findOne: jest.fn().mockResolvedValue(targetStudent) });
    const memberships = repository({ find: jest.fn().mockResolvedValue([{ organization: { id: "org-a" } }]) });
    const sourcePlan = { id: "plan-a", date: "2026-09-21", status: "PUBLISHED", student: sourceStudent, tasks: [{ type: "STUDY", title: "Math", subject: "Math", description: "", startTime: "08:00", endTime: "09:00", duration: 60, testCount: 0, note: "", priority: 0, status: "DONE", completedAt: new Date() }] };
    const plans = repository({
      findOne: jest.fn().mockResolvedValueOnce(sourcePlan).mockResolvedValueOnce(null),
      findOneOrFail: jest.fn().mockResolvedValue({ id: "copy" }),
    });
    const tasks: any = repository();
    const service = new EducationSharingService(students, memberships, plans, tasks, repository(), repository(), {} as never);
    await service.sharePlan(actor, "plan-a", "student-b");
    expect(tasks.save).toHaveBeenCalledWith([expect.objectContaining({ status: "PLANNED", completedAt: null })]);
  });

  it("rejects student sharing across organization boundaries", async () => {
    const source = { id: "student-a", accountStatus: "active", user: { id: "user-a" } };
    const target = { id: "student-b", accountStatus: "active", user: { id: "user-b" } };
    const students = repository({ findOne: jest.fn().mockResolvedValue(target) });
    const memberships = repository({ find: jest.fn().mockResolvedValueOnce([{ organization: { id: "org-a" } }]).mockResolvedValueOnce([{ organization: { id: "org-b" } }]) });
    const plans = repository({ findOne: jest.fn().mockResolvedValue({ id: "plan-a", student: source, tasks: [] }) });
    const service = new EducationSharingService(students, memberships, plans, repository(), repository(), repository(), {} as never);
    await expect(service.sharePlan(actor, "plan-a", "student-b")).rejects.toMatchObject({
      response: { error: { code: "SHARE_SCOPE_FORBIDDEN" } },
    });
  });
});
