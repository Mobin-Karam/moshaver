import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";
import { AuthService } from "../src/modules/auth/auth.service";
import { Session } from "../src/database/entities/session.entity";
import { User, UserRole } from "../src/database/entities/user.entity";

function repo<T>(items: T[] = []) {
  return {
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) => items.find((item) => Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value)) || null),
    find: jest.fn(async () => items),
    save: jest.fn(async (item: T) => ({ id: "session-1", ...item })),
    create: jest.fn((item: T) => item),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
}

describe("AuthService", () => {
  it("creates a session for valid credentials", async () => {
    const user = { id: "u1", username: "admin", role: UserRole.ADMIN, passwordHash: await bcrypt.hash("secret", 4) } as User;
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo([user]) },
        { provide: getRepositoryToken(Session), useValue: repo() },
        { provide: ConfigService, useValue: { get: (_key: string, fallback: unknown) => fallback } },
      ],
    }).compile();

    const result = await module.get(AuthService).login("admin", "secret");
    expect(result.user.username).toBe("admin");
    expect(result.csrfToken).toBeTruthy();
  });

  it("changes the password and revokes other sessions", async () => {
    const user = { id: "u1", username: "student", role: UserRole.STUDENT, passwordHash: await bcrypt.hash("current-password", 4) } as User;
    const users = repo([user]);
    const sessions = repo();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Session), useValue: sessions },
        { provide: ConfigService, useValue: { get: (_key: string, fallback: unknown) => fallback } },
      ],
    }).compile();

    await expect(module.get(AuthService).changePassword(
      { id: "u1", username: "student", role: UserRole.STUDENT, sessionId: "current" },
      "current-password",
      "a-new-password-long-enough",
    )).resolves.toEqual({ changed: true, otherSessionsRevoked: true });
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ id: "u1", passwordHash: expect.any(String) }));
    expect(sessions.delete).toHaveBeenCalled();
  });

  it("rejects an incorrect current password", async () => {
    const user = { id: "u1", passwordHash: await bcrypt.hash("current-password", 4) } as User;
    const sessions = repo();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo([user]) },
        { provide: getRepositoryToken(Session), useValue: sessions },
        { provide: ConfigService, useValue: { get: (_key: string, fallback: unknown) => fallback } },
      ],
    }).compile();

    await expect(module.get(AuthService).changePassword(
      { id: "u1", username: "student", role: UserRole.STUDENT, sessionId: "current" },
      "wrong-password",
      "a-new-password-long-enough",
    )).rejects.toMatchObject({ response: { error: { code: "INVALID_CREDENTIALS" } } });
    expect(sessions.delete).not.toHaveBeenCalled();
  });

  it("does not allow revoking the current session", async () => {
    const sessions = repo();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo() },
        { provide: getRepositoryToken(Session), useValue: sessions },
        { provide: ConfigService, useValue: { get: (_key: string, fallback: unknown) => fallback } },
      ],
    }).compile();

    await expect(module.get(AuthService).revokeSession(
      { id: "u1", username: "student", role: UserRole.STUDENT, sessionId: "current" },
      "current",
    )).rejects.toMatchObject({ response: { error: { code: "CURRENT_SESSION" } } });
    expect(sessions.delete).not.toHaveBeenCalled();
  });
});
