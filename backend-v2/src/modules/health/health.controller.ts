import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { ok } from "../../common/utils/envelope";

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}
  @Get("health") health() { return ok({ service: "moshaver-backend-v2", status: "ok" }); }
  @Get("ready") async ready() {
    try { await this.dataSource.query("SELECT 1 AS ready"); return ok({ database: "ready" }); }
    catch { throw new ApiException(503, "DATABASE_UNAVAILABLE", "سرویس پایگاه داده آماده نیست."); }
  }
}
