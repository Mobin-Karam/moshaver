import { ApiException } from "../src/common/exceptions/api.exception";
import { ChatService } from "../src/modules/chat/chat.service";

function repo(overrides: Record<string, unknown> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
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
) {
  return new ChatService(
    repo(),
    repo(),
    repo(),
    realtime,
    repo(),
    members,
    repo(),
    repo(),
    repo(),
    { transaction: jest.fn() } as any,
  );
}

describe("ChatService membership isolation", () => {
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
          conversation: { members: { user: { student: true } }, owner: true },
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
});
