import { ApiException } from "../src/common/exceptions/api.exception";
import { ChatService } from "../src/modules/chat/chat.service";

function repo(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    findOneBy: jest.fn(async () => null),
    findOneByOrFail: jest.fn(async ({ id }) => ({ id })),
    exist: jest.fn(async () => false),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 0),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    })),
    ...overrides,
  } as any;
}

function service(
  members = repo(),
  realtime = { emitToUsers: jest.fn() } as any,
  options: { conversations?: any; relationships?: any; users?: any; roleAssignments?: any } = {},
) {
  return new ChatService(
    repo(),
    repo(),
    options.users || repo(),
    realtime,
    options.conversations || repo(),
    members,
    repo(),
    repo(),
    options.relationships || repo(),
    repo(),
    options.roleAssignments || repo(),
    { transaction: jest.fn() } as any,
  );
}

describe("ChatService reaction configuration", () => {
  it("uses the ten safe defaults when no configuration row exists", async () => {
    await expect(service().configuration()).resolves.toEqual({
      allowedEmojis: ["❤️", "👍", "😂", "👏", "😮", "😢", "🔥", "🎉", "🙏", "✅"],
    });
  });

  it("only lets a platform admin update one to ten reactions", async () => {
    await expect(service().updateConfiguration({ roles: ["ORGANIZATION_ADMIN"] } as any, ["👍"]))
      .rejects.toMatchObject({ response: { error: expect.objectContaining({ code: "PLATFORM_ADMIN_REQUIRED" }) } });
    await expect(service().updateConfiguration({ roles: ["PLATFORM_ADMIN"] } as any, []))
      .rejects.toMatchObject({ response: { error: expect.objectContaining({ code: "INVALID_EMOJIS" }) } });
    await expect(service().updateConfiguration({ roles: ["PLATFORM_ADMIN"] } as any, ["👍", "👍", "❤️"]))
      .resolves.toEqual({ allowedEmojis: ["👍", "❤️"] });
  });
});

describe("ChatService user profiles", () => {
  it("allows one username change and enforces the 30-day cooldown", async () => {
    const account = { id: "u1", username: "old_name", usernameChangeCount: 0, usernameChangedAt: null, chatDisplayName: "", chatBio: "", chatAvatarUrl: "", firstName: "", lastName: "" };
    const users = repo({ findOne: jest.fn(async () => account) });
    const chat = service(undefined, undefined, { users });
    await expect(chat.updateProfile({ id: "u1" } as any, { username: "new_name", displayName: "سارا", bio: "دانش‌آموز" }))
      .resolves.toMatchObject({ username: "new_name", displayName: "سارا", bio: "دانش‌آموز", usernameChange: { count: 1, allowed: false } });
    await expect(chat.updateProfile({ id: "u1" } as any, { username: "another_name" }))
      .rejects.toMatchObject({ response: { error: expect.objectContaining({ code: "USERNAME_CHANGE_COOLDOWN" }) } });
  });

  it("lets only a platform admin reset the username cooldown", async () => {
    const account = { id: "u1", usernameChangedAt: new Date() };
    const users = repo({ findOneBy: jest.fn(async () => account) });
    const chat = service(undefined, undefined, { users });
    await expect(chat.allowUsernameChange({ roles: ["ORGANIZATION_ADMIN"] } as any, "u1"))
      .rejects.toMatchObject({ response: { error: expect.objectContaining({ code: "PLATFORM_ADMIN_REQUIRED" }) } });
    await expect(chat.allowUsernameChange({ roles: ["PLATFORM_ADMIN"] } as any, "u1"))
      .resolves.toEqual({ userId: "u1", usernameChangeAllowed: true });
    expect(account.usernameChangedAt).toBeNull();
  });
});

describe("ChatService membership isolation", () => {
  it("allows a guardian to start a direct conversation with another student without granting observation access", async () => {
    const users = repo({
      findOne: jest.fn(async ({ where }: any) => where.id === "student-user" ? { id: "student-user", student: { id: "student-2" } } : { id: "guardian", student: null }),
      findOneByOrFail: jest.fn(async ({ id }: any) => ({ id })),
    });
    const relationships = repo();
    const roleAssignments = repo({ exist: jest.fn(async () => true) });
    await expect(service(undefined, undefined, { users, relationships, roleAssignments }).createDirect({ id: "guardian" } as any, "student-user")).resolves.toBeUndefined();
    expect(roleAssignments.exist).toHaveBeenCalledWith(expect.objectContaining({ where: { user: { id: "guardian" }, role: { code: "GUARDIAN" } } }));
    expect(relationships.exist).not.toHaveBeenCalled();
  });

  it("lists only conversations where the current user is an active member", async () => {
    const members = repo({ find: jest.fn(async () => []) });
    await expect(
      service(members).conversations({ id: "u1" } as any),
    ).resolves.toEqual([]);
    expect(members.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user: { id: "u1" } }),
      }),
    );
  });

  it("projects the student peer into direct conversation rows", async () => {
    const conversation = {
      id: "direct-1",
      type: "DIRECT",
      title: "",
      members: [
        {
          role: "MEMBER",
          leftAt: null,
          user: { id: "staff-1", username: "staff" },
        },
        {
          role: "MEMBER",
          leftAt: null,
          user: {
            id: "student-user-1",
            username: "student",
            student: {
              id: "student-1",
              name: "دانش‌آموز نمونه",
              grade: "دوازدهم",
              major: "ریاضی",
              accountStatus: "active",
            },
          },
        },
      ],
    };
    const members = repo({
      find: jest.fn(async () => [
        { conversation, role: "MEMBER", muted: false },
      ]),
    });

    await expect(
      service(members).conversations({
        id: "staff-1",
        role: "ADVISOR",
        roles: ["ADVISOR"],
      } as any),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "direct-1",
        student: expect.objectContaining({
          id: "student-1",
          name: "دانش‌آموز نمونه",
          grade: "دوازدهم",
        }),
      }),
    ]);
    expect(members.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: {
          conversation: { members: { user: { student: true } }, owner: true, organization: true },
        },
      }),
    );
  });

  it("rejects message access without active conversation membership", async () => {
    await expect(
      service().messagesForConversation({ id: "u1" } as any, "private-chat"),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it("rejects blank messages before persistence", async () => {
    const conversation = { id: "c1", members: [] };
    const members = repo({
      findOne: jest.fn(async () => ({ conversation, user: { id: "u1" } })),
    });
    await expect(
      service(members).send({ id: "u1" } as any, "c1", "  "),
    ).rejects.toMatchObject({
      response: {
        error: expect.objectContaining({ code: "MESSAGE_REQUIRED" }),
      },
    });
  });

  it("emits the canonical created event with its conversation envelope", async () => {
    const conversation = { id: "c1", title: "", members: [] };
    const members = repo({
      findOne: jest.fn(async () => ({ conversation, user: { id: "u1" } })),
      find: jest.fn(async () => [{ user: { id: "u1" } }]),
    });
    const realtime = { emitToUsers: jest.fn() };
    await service(members, realtime).send({ id: "u1" } as any, "c1", "سلام");
    expect(realtime.emitToUsers).toHaveBeenCalledWith(
      ["u1"],
      "chat.message.created",
      expect.objectContaining({
        conversationId: "c1",
        message: expect.objectContaining({ text: "سلام", type: "text" }),
      }),
    );
  });

  it("allows a related guardian to read an opted-in student's messages without membership", async () => {
    const child = { id: "student-1", name: "سارا", guardianChatReadOnly: true };
    const conversation = { id: "c1", archivedAt: null, members: [{ leftAt: null, role: "MEMBER", user: { id: "student-user", student: child } }] };
    const members = repo({ findOne: jest.fn(async () => null) });
    const conversations = repo({ findOne: jest.fn(async () => conversation) });
    const relationships = repo({ exist: jest.fn(async () => true) });
    const result = await service(members, undefined, { conversations, relationships }).messagesForConversation({ id: "guardian", role: "ADMIN", roles: ["GUARDIAN"] } as any, "c1");
    expect(result).toEqual([]);
  });

  it("does not expose an opted-out student's conversation to a guardian", async () => {
    const child = { id: "student-1", name: "سارا", guardianChatReadOnly: false };
    const conversation = { id: "c1", archivedAt: null, members: [{ leftAt: null, role: "MEMBER", user: { id: "student-user", student: child } }] };
    await expect(service(repo({ findOne: jest.fn(async () => null) }), undefined, { conversations: repo({ findOne: jest.fn(async () => conversation) }) }).messagesForConversation({ id: "guardian", roles: ["GUARDIAN"] } as any, "c1"))
      .rejects.toMatchObject({ response: { error: expect.objectContaining({ code: "CONVERSATION_NOT_FOUND" }) } });
  });

  it("adds opted-in child conversations to the guardian inbox as read-only", async () => {
    const child = { id: "student-1", name: "سارا", guardianChatReadOnly: true, user: { id: "student-user" } };
    const conversation = { id: "c1", type: "DIRECT", title: "", archivedAt: null, members: [{ leftAt: null, role: "MEMBER", user: { id: "student-user", username: "sara", student: child } }, { leftAt: null, role: "MEMBER", user: { id: "advisor", username: "advisor" } }] };
    const observedMembership = { conversation, user: conversation.members[0].user, role: "MEMBER", muted: false };
    const members = repo({ find: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([observedMembership]) });
    const relationships = repo({ find: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ toStudent: child }]).mockResolvedValueOnce([]) });
    await expect(service(members, undefined, { relationships }).conversations({ id: "guardian", roles: ["GUARDIAN"] } as any))
      .resolves.toEqual([expect.objectContaining({ id: "c1", readOnly: true, observedStudent: { id: "student-1", name: "سارا" } })]);
  });
});
