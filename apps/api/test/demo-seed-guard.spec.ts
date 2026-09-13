import os from "node:os";
import path from "node:path";
import { requireSafeDemoDatabase } from "../src/database/seeds/demo-guard";

describe("demo database guard", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("refuses production even when explicitly enabled", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEMO_SEED = "true";
    process.env.DATABASE_PATH = path.join(os.tmpdir(), "moshaver-demo.sqlite");

    expect(() => requireSafeDemoDatabase("seed")).toThrow("Refusing demo seed");
  });

  it("requires an explicit opt-in", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_DEMO_SEED;
    process.env.DATABASE_PATH = path.join(os.tmpdir(), "moshaver-demo.sqlite");

    expect(() => requireSafeDemoDatabase("seed")).toThrow("ALLOW_DEMO_SEED=true");
  });

  it("refuses an ordinary non-demo database path", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEMO_RESET = "true";
    process.env.DATABASE_PATH = "/var/lib/moshaver/production.sqlite";

    expect(() => requireSafeDemoDatabase("reset")).toThrow("demo/test/e2e");
  });

  it("allows a named demo database after explicit opt-in", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEMO_SEED = "true";
    process.env.DATABASE_PATH = "/var/lib/moshaver/product-demo.sqlite";

    expect(requireSafeDemoDatabase("seed")).toBe("/var/lib/moshaver/product-demo.sqlite");
  });
});
