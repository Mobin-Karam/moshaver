import { SignupThrottleService } from "../src/modules/onboarding/signup-throttle.service";

describe("SignupThrottleService", () => {
  it("limits repeated signup attempts without storing the raw IP", async () => {
    const rows: any[] = [];
    const repo = {
      findOne: jest.fn(async ({ where }: any) => rows.find((item) => item.key === where.key) ?? null),
      create: jest.fn((value: any) => ({ id: "one", ...value })),
      save: jest.fn(async (value: any) => { const index = rows.findIndex((item) => item.key === value.key); if (index >= 0) rows[index] = value; else rows.push(value); return value; }),
    };
    const service = new SignupThrottleService(repo as any, { get: (key: string, fallback: number) => key === "signupMaxAttempts" ? 2 : fallback } as any);
    await service.record("192.0.2.20");
    await service.record("192.0.2.20");
    await expect(service.record("192.0.2.20")).rejects.toMatchObject({ response: { error: { code: "SIGNUP_THROTTLED" } } });
    expect(JSON.stringify(rows)).not.toContain("192.0.2.20");
  });
});
