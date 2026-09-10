import { LearningResourcesService } from "../src/modules/learning-resources/learning-resources.service";

const actor = {
  id: "manager-1",
  username: "manager",
  sessionId: "session-1",
  role: "ORGANIZATION_ADMIN",
  roles: ["ORGANIZATION_ADMIN"],
  capabilities: ["learning_resources.manage", "learning_resources.read"],
  membershipIds: ["membership-1"],
  organizationIds: ["organization-1"],
};

describe("LearningResourcesService authorization", () => {
  function setup(canAccess: (id: string) => boolean) {
    const resources = {
      find: jest.fn(async () => [
        { id: "own", createdBy: { id: actor.id }, assignments: [] },
        { id: "inside", createdBy: { id: "other" }, assignments: [{ student: { id: "student-1" } }] },
        { id: "outside", createdBy: { id: "other" }, assignments: [{ student: { id: "student-2" } }] },
      ]),
      save: jest.fn(),
      create: jest.fn(),
    };
    const authorization = { canAccessStudent: jest.fn(async (_context, id) => canAccess(id)) };
    const service = new LearningResourcesService(resources as any, { delete: jest.fn(), save: jest.fn(), create: jest.fn(), find: jest.fn() } as any, { findBy: jest.fn() } as any, authorization as any);
    return { service, authorization };
  }

  it("lists only owned or in-scope resources for organization managers", async () => {
    const { service } = setup((id) => id === "student-1");
    await expect(service.listManaged(actor as any)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: "own" }), expect.objectContaining({ id: "inside" })]));
    await expect(service.listManaged(actor as any)).resolves.not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "outside" })]));
  });

  it("rejects assignment when any selected student is outside the actor scope", async () => {
    const { service } = setup((id) => id === "student-1");
    await expect(service.create(actor as any, { title: "راهنما", description: "", type: "LINK", url: "https://example.com", status: "PUBLISHED", studentIds: ["student-1", "student-2"] })).rejects.toMatchObject({ response: { error: { code: "STUDENT_SCOPE_FORBIDDEN" } } });
  });

  it("allows platform administrators to view the complete resource inventory", async () => {
    const { service, authorization } = setup(() => false);
    const rows = await service.listManaged({ ...actor, role: "PLATFORM_ADMIN", roles: ["PLATFORM_ADMIN"] } as any);
    expect(rows).toHaveLength(3);
    expect(authorization.canAccessStudent).not.toHaveBeenCalled();
  });
});
