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
    save: jest.fn(async (item: T) => ({ id: "session-1", ...item })),
    create: jest.fn((item: T) => item),
    delete: jest.fn(),
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
});
