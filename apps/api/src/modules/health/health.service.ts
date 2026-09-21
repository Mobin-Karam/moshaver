import { Injectable } from "@nestjs/common";
import { CmbHealthService } from "@moshaver/cmb-health";
import { CmbRuntimeService } from "../../platform/cmb-runtime.service";

@Injectable()
export class HealthService {
  private readonly core: CmbHealthService;

  constructor(runtime: CmbRuntimeService) {
    this.core = new CmbHealthService({
      serviceName: "moshaver-backend-v2",
      probes: runtime.readinessProbes(),
    });
  }

  health() {
    return this.core.health();
  }

  ready() {
    return this.core.ready();
  }
}
