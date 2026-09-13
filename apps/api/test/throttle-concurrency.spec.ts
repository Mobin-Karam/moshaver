import "reflect-metadata";
import { DataSource } from "typeorm";
import { LoginThrottle } from "../src/database/entities/login-throttle.entity";
import { SignupThrottle } from "../src/database/entities/signup-throttle.entity";
import { LoginThrottleService } from "../src/modules/auth/login-throttle.service";
import { SignupThrottleService } from "../src/modules/onboarding/signup-throttle.service";

describe("SQLite throttle concurrency", () => {
  let db: DataSource;

  beforeEach(async () => {
    db = new DataSource({ type: "better-sqlite3", database: ":memory:", entities: [LoginThrottle, SignupThrottle], synchronize: true });
    await db.initialize();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("atomically records login failures from separate service instances", async () => {
    const repo = db.getRepository(LoginThrottle);
    const config = { get: (_key: string, fallback: number) => fallback } as any;
    const services = [new LoginThrottleService(repo, config), new LoginThrottleService(repo, config)];

    await Promise.all(Array.from({ length: 8 }, (_, index) => services[index % services.length].failure("192.0.2.9", "student")));

    const rows = await repo.find();
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.attempts === 8)).toBe(true);
  });

  it("atomically records signup attempts and returns a controlled throttle error", async () => {
    const repo = db.getRepository(SignupThrottle);
    const config = { get: (key: string, fallback: number) => key === "signupMaxAttempts" ? 5 : fallback } as any;
    const services = [new SignupThrottleService(repo, config), new SignupThrottleService(repo, config)];

    await Promise.all(Array.from({ length: 5 }, (_, index) => services[index % services.length].record("192.0.2.10")));

    await expect(services[0].record("192.0.2.10")).rejects.toMatchObject({ response: { error: { code: "SIGNUP_THROTTLED" } } });
    expect(await repo.count()).toBe(1);
  });
});
