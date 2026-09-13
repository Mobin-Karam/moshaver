import { Conversation, ConversationMember } from "../src/database/entities";
import { ensureOrganizationChat, leaveOrganizationChat } from "../src/modules/chat/organization-chat";

describe("organization managed chat", () => {
  it("creates the official group and immediately joins a new organization member", async () => {
    const saved: Array<{ entity: unknown; value: any }> = [];
    const manager = {
      findOne: jest.fn(async (entity: unknown) => entity === Conversation ? null : null),
      create: jest.fn((_entity: unknown, value: any) => value),
      save: jest.fn(async (entity: unknown, value: any) => {
        const result = entity === Conversation ? { id: "group-1", ...value } : { id: "member-1", ...value };
        saved.push({ entity, value: result });
        return result;
      }),
    } as any;
    const organization = { id: "org-1", name: "مدرسه امید" } as any;
    const user = { id: "user-1" } as any;
    await expect(ensureOrganizationChat(manager, organization, user)).resolves.toMatchObject({ id: "group-1", autoManaged: true, organization });
    expect(saved).toEqual(expect.arrayContaining([
      expect.objectContaining({ entity: Conversation, value: expect.objectContaining({ title: "مدرسه امید · گروه سازمان", autoManaged: true }) }),
      expect.objectContaining({ entity: ConversationMember, value: expect.objectContaining({ conversation: expect.objectContaining({ id: "group-1" }), user }) }),
    ]));
  });

  it("marks membership left when a user leaves the organization", async () => {
    const membership = { id: "member-1", leftAt: null };
    const manager = { findOne: jest.fn(async () => membership), save: jest.fn(async (_entity: unknown, value: any) => value) } as any;
    await leaveOrganizationChat(manager, "org-1", "user-1");
    expect(membership.leftAt).toBeInstanceOf(Date);
    expect(manager.save).toHaveBeenCalledWith(ConversationMember, membership);
  });
});
