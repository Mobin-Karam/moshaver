import { NotificationType } from "../src/database/entities/notification.entity";
import { UserRole } from "../src/database/entities/user.entity";
import { NotificationsService } from "../src/modules/notifications/notifications.service";

function repository<T>(items: T[] = []) {
  const queryBuilder: any = {
    where: jest.fn(function () { return this; }), andWhere: jest.fn(function () { return this; }),
    orderBy: jest.fn(function () { return this; }), addOrderBy: jest.fn(function () { return this; }), take: jest.fn(function () { return this; }),
    getMany: jest.fn(async () => items), getCount: jest.fn(async () => items.filter((item) => !(item as any).readAt).length),
    update: jest.fn(function () { return this; }), set: jest.fn(function () { return this; }), execute: jest.fn(async () => ({ affected: 1 })),
  };
  return {
    findOne: jest.fn(async ({ where }: { where: Record<string, any> }) => items.find((item) => (item as any).id === where.id || (where.user?.id && (item as any).user?.id === where.user.id)) || null),
    find: jest.fn(async () => items),
    count: jest.fn(async () => items.filter((item) => !(item as any).readAt).length),
    update: jest.fn(async () => ({ affected: 1 })),
    create: jest.fn((item: T) => item),
    save: jest.fn(async (item: T) => item),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
}

describe("NotificationsService", () => {
  it("lists notifications belonging to the authenticated user", async () => {
    const student = { id: "student-1", user: { id: "student-user" } } as any;
    const notification = { id: "n1", user: student.user, type: NotificationType.MESSAGE, category: "general", title: "Title", body: "Message", priority: "normal", readAt: null, createdAt: new Date() } as any;
    const service = new NotificationsService(repository([notification]) as any, repository([student]) as any, {} as any);

    await expect(service.list({ id: "student-user", role: UserRole.STUDENT } as any)).resolves.toMatchObject({ unreadCount: 1, items: [{ id: "n1", isRead: false }] });
  });

  it("marks all owned unread notifications for every authenticated role", async () => {
    const student = { id: "student-1", user: { id: "student-user" } } as any;
    const notifications = repository([{ id: "n1", readAt: null }]) as any;
    const service = new NotificationsService(notifications, repository([student]) as any, {} as any);

    await expect(service.markAllRead({ id: "student-user", role: UserRole.STUDENT } as any)).resolves.toEqual({ updated: 1 });
    await expect(service.list({ id: "admin-user", role: UserRole.ADMIN } as any)).resolves.toMatchObject({ unreadCount: 1 });
  });
});
