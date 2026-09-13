import "reflect-metadata";
import fs from "node:fs";
import { requireSafeDemoDatabase } from "./demo-guard";

async function resetProductDemo() {
  const database = requireSafeDemoDatabase("reset");
  const removed: string[] = [];
  for (const candidate of [database, `${database}-wal`, `${database}-shm`]) {
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
      removed.push(candidate);
    }
  }
  console.log(JSON.stringify({ database, removed }, null, 2));
}

resetProductDemo().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
