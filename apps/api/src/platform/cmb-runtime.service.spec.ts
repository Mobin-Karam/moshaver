import { DataSource } from "typeorm";
import { CmbRuntimeService } from "./cmb-runtime.service";

describe("CmbRuntimeService", () => {
  it("composes reusable modules and reports active adapters", async () => {
    const query = jest.fn().mockResolvedValue([{ ready: 1 }]);
    const runtime = new CmbRuntimeService({ query } as unknown as DataSource);
    expect(runtime.moduleInventory().map((module) => module.id)).toEqual(expect.arrayContaining(["kernel", "health", "auth", "authorization", "persistence", "notifications", "realtime"]));
    expect(runtime.adapterInventory()).toEqual(expect.arrayContaining([{ port: "persistence.database", id: "typeorm-sqlite", required: true }]));
    for (const probe of runtime.readinessProbes()) await probe.check();
    expect(query).toHaveBeenCalledWith("SELECT 1 AS ready");
  });
});
