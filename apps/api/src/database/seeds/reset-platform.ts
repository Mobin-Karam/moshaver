import "reflect-metadata";
import fs from "node:fs";
import { requireSafePlatformDatabase } from "./demo-guard";

async function resetPlatform() {
  const database = requireSafePlatformDatabase("reset");
  const removed: string[] = [];
  for (const candidate of [database, `${database}-wal`, `${database}-shm`]) {
    if (fs.existsSync(candidate)) { fs.unlinkSync(candidate); removed.push(candidate); }
  }
  console.log(JSON.stringify({ database, removed }, null, 2));
}

resetPlatform().catch((error) => { console.error(error); process.exitCode = 1; });
