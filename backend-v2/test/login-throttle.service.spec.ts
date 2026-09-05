import { LoginThrottleService } from "../src/modules/auth/login-throttle.service";

function repository() {
  const rows: any[] = [];
  return {
    rows,
    find: jest.fn(async ({ where }: any) => rows.filter((row) => where.key._value.includes(row.key))),
    findOne: jest.fn(async ({ where }: any) => rows.find((row) => row.key === where.key) ?? null),
    create: jest.fn((value: any) => ({ id: String(rows.length + 1), ...value })),
    save: jest.fn(async (value: any) => { const index = rows.findIndex((row) => row.key === value.key); if (index >= 0) rows[index] = value; else rows.push(value); return value; }),
    delete: jest.fn(async ({ key }: any) => { const keys = key._value; for (let index = rows.length - 1; index >= 0; index -= 1) if (keys.includes(rows[index].key)) rows.splice(index, 1); return { affected: 1 }; }),
  };
}

describe("LoginThrottleService", () => {
  it("locks repeated failures without storing raw identifiers", async () => {
    const repo = repository();
    const service = new LoginThrottleService(repo as any, { get: (key: string, fallback: number) => key === "loginMaxAttempts" ? 2 : fallback } as any);
    await service.failure("192.0.2.1", "Student@Example.com");
    await service.failure("192.0.2.1", "Student@Example.com");
    expect(repo.rows).toHaveLength(3);
    expect(JSON.stringify(repo.rows)).not.toContain("Student@Example.com");
    await expect(service.assertAllowed("192.0.2.1", "student@example.com")).rejects.toMatchObject({ response: { error: { code: "LOGIN_THROTTLED" } } });
  });
});
