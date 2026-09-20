import path from "node:path";
import os from "node:os";

export function requireSafeDemoDatabase(action: "seed" | "reset") {
  const allow = action === "seed" ? process.env.ALLOW_DEMO_SEED : process.env.ALLOW_DEMO_RESET;
  if (process.env.NODE_ENV === "production" || allow !== "true") {
    throw new Error(`Refusing demo ${action}: use NODE_ENV=development and ALLOW_DEMO_${action === "seed" ? "SEED" : "RESET"}=true.`);
  }
  const database = path.resolve(process.env.DATABASE_PATH || "");
  const safeName = /(?:demo|test|e2e)/i.test(path.basename(database));
  const inTemp = database.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`);
  if (!database || (!safeName && !inTemp)) {
    throw new Error(`Refusing demo ${action}: DATABASE_PATH must name a demo/test/e2e database or live under the system temporary directory.`);
  }
  return database;
}

export function requireSafePlatformDatabase(action: "seed" | "reset") {
  const allow = action === "seed" ? process.env.ALLOW_PLATFORM_SEED : process.env.ALLOW_PLATFORM_RESET;
  if (process.env.NODE_ENV === "production" || allow !== "true") throw new Error(`Refusing platform ${action}: explicit development opt-in is required.`);
  const database = path.resolve(process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "moshaver-v2.sqlite"));
  const expected = path.resolve(process.cwd(), "data", "moshaver-v2.sqlite");
  const inTemp = database.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`);
  if (database !== expected && !inTemp) throw new Error("Refusing platform reset outside the API development database or system temporary directory.");
  return database;
}
