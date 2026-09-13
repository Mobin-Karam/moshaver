import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CmbHealthService } from "@moshaver/cmb-health";

@Injectable()
export class HealthService {
  private readonly core: CmbHealthService;

  constructor(dataSource: DataSource) {
    this.core = new CmbHealthService({
      serviceName: "moshaver-backend-v2",
      probes: [
        {
          name: "database",
          check: async () => {
            await dataSource.query("SELECT 1 AS ready");
          },
        },
      ],
    });
  }

  health() {
    return this.core.health();
  }

  ready() {
    return this.core.ready();
  }
}
