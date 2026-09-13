import { Controller, Get } from "@nestjs/common";
import { ApiException } from "../../common/exceptions/api.exception";
import { ok } from "../../common/utils/envelope";
import { HealthService } from "./health.service";

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("health")
  health() {
    return ok(this.healthService.health());
  }

  @Get("ready")
  async ready() {
    try {
      return ok(await this.healthService.ready());
    } catch {
      throw new ApiException(503, "DATABASE_UNAVAILABLE", "سرویس پایگاه داده آماده نیست.");
    }
  }
}
