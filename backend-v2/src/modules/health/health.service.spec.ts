import { DataSource } from "typeorm";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("preserves the public liveness payload", () => {
    const dataSource = { query: jest.fn() } as unknown as DataSource;
    const service = new HealthService(dataSource);
    expect(service.health()).toEqual({ service: "moshaver-backend-v2", status: "ok" });
  });

  it("maps the database probe into readiness", async () => {
    const query = jest.fn().mockResolvedValue([{ ready: 1 }]);
    const service = new HealthService({ query } as unknown as DataSource);
    await expect(service.ready()).resolves.toEqual({ database: "ready" });
    expect(query).toHaveBeenCalledWith("SELECT 1 AS ready");
  });
});
