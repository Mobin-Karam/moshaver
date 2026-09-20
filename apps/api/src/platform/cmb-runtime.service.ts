import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ACTIVITY_MODULE } from "@moshaver/cmb-activity";
import { AUTH_MODULE } from "@moshaver/cmb-auth";
import { AUTHORIZATION_MODULE } from "@moshaver/cmb-authorization";
import { DATA_TRANSFER_MODULE } from "@moshaver/cmb-data-transfer";
import { HEALTH_MODULE } from "@moshaver/cmb-health";
import { IDENTITY_MODULE } from "@moshaver/cmb-identity";
import { CmbAdapterRegistry, INFRASTRUCTURE_MODULE } from "@moshaver/cmb-infrastructure";
import { CmbModuleRegistry } from "@moshaver/cmb-kernel";
import { NOTIFICATIONS_MODULE } from "@moshaver/cmb-notifications";
import { PERSISTENCE_MODULE } from "@moshaver/cmb-persistence";
import { REALTIME_MODULE } from "@moshaver/cmb-realtime";
import { SYSTEM_MODULE } from "@moshaver/cmb-system";
import { TENANCY_MODULE } from "@moshaver/cmb-tenancy";

@Injectable()
export class CmbRuntimeService {
  private readonly modules = new CmbModuleRegistry([
    HEALTH_MODULE,
    INFRASTRUCTURE_MODULE,
    PERSISTENCE_MODULE,
    IDENTITY_MODULE,
    TENANCY_MODULE,
    AUTH_MODULE,
    AUTHORIZATION_MODULE,
    SYSTEM_MODULE,
    REALTIME_MODULE,
    NOTIFICATIONS_MODULE,
    ACTIVITY_MODULE,
    DATA_TRANSFER_MODULE,
  ]);

  private readonly adapters: CmbAdapterRegistry;

  constructor(dataSource: DataSource) {
    this.modules.resolve();
    this.adapters = new CmbAdapterRegistry([
      {
        port: "persistence.database",
        id: "typeorm-sqlite",
        required: true,
        ready: async () => {
          await dataSource.query("SELECT 1 AS ready");
        },
      },
      { port: "realtime.transport", id: "in-process-sse", required: false },
      { port: "notifications.delivery", id: "web-push", required: false },
    ]);
  }

  moduleInventory() {
    return this.modules.metadata();
  }

  adapterInventory() {
    return this.adapters.inventory();
  }

  readinessProbes() {
    return [
      { name: "modules", check: async () => void this.modules.resolve() },
      ...this.adapters.readinessProbes().map((probe) => ({ ...probe, name: probe.name === "adapter:persistence.database" ? "database" : probe.name })),
    ];
  }
}
