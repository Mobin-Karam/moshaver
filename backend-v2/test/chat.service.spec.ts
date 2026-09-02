import { ApiException } from "../src/common/exceptions/api.exception";
import { ChatService } from "../src/modules/chat/chat.service";
import { UserRole } from "../src/database/entities/user.entity";

function repository<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async ({ where }: { where: Record<string, any> }) => {
      return items.find((item) => Object.entries(where).every(([key, value]) => key === "user" ? (item as any).user?.id === value.id : (item as any)[key] === value)) || null;
    }),
    find: jest.fn(async () => items),
    update: jest.fn(async () => ({ affected: 2 })),
    create: jest.fn((item: T) => item),
    save: jest.fn(async (item: T) => item),
  };
}

describe("ChatService", () => {
  it("discovers the authenticated student's advisor conversation with unread count", async () => {
    const studentUser = { id: "student-user", role: UserRole.STUDENT } as any;
    const admin = { id: "admin-user", role: UserRole.ADMIN } as any;
    const student = { id: "student-1", name: "Student", user: studentUser } as any;
    const messages = repository([
      { id: "m1", sender: admin, receiverId: studentUser.id, content: "unread", type: "TEXT", createdAt: new Date() },
      { id: "m2", sender: studentUser, receiverId: admin.id, content: "reply", type: "TEXT", createdAt: new Date() },
    ]) as any;
    const service = new ChatService(messages, repository([student]) as any, repository([admin]) as any, { publish: jest.fn() } as any);

    const result = await service.conversationsForStudent(studentUser);

    expect(result[0]).toMatchObject({ id: student.id, unread: 1, lastMessage: { id: "m1" } });
  });

  it("rejects conversation discovery for a student without an owned profile", async () => {
    const service = new ChatService(repository() as any, repository() as any, repository() as any, {} as any);

    await expect(service.conversationsForStudent({ id: "other", role: UserRole.STUDENT } as any)).rejects.toBeInstanceOf(ApiException);
  });

  it("marks only unread messages received by the authenticated user", async () => {
    const student = { id: "student-1", user: { id: "student-user" } } as any;
    const admin = { id: "admin-user", role: UserRole.ADMIN } as any;
    const messages = repository() as any;
    const service = new ChatService(messages, repository([student]) as any, repository([admin]) as any, {} as any);

    await service.markRead({ id: "student-user", role: UserRole.STUDENT } as any, student.id);

    expect(messages.update).toHaveBeenCalledWith({ sender: { id: admin.id }, receiverId: "student-user", readAt: expect.anything() }, { readAt: expect.any(Date) });
  });

  it("rejects a student trying to open another student's conversation", async () => {
    const service = new ChatService(repository() as any, repository([{ id: "student-1", user: { id: "student-user" } }]) as any, repository([{ id: "admin-user", role: UserRole.ADMIN }]) as any, {} as any);

    await expect(service.messagesForConversation({ id: "student-user", role: UserRole.STUDENT } as any, "student-2")).rejects.toBeInstanceOf(ApiException);
  });
});