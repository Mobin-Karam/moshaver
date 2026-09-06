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
