import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ok } from "../../common/utils/envelope";

@Controller("sync")
export class SyncController {
  @Get()
  sync(@Query("lastSync") lastSync?: string) {
    return ok({ lastSync: lastSync || null, plans: [], tasks: [], messages: [], notifications: [], exams: [], serverTime: new Date().toISOString() });
  }

  @Post("upload")
  upload(@Body() body: { changes?: unknown[] }) {
    return ok({ accepted: Array.isArray(body?.changes) ? body.changes.length : 0, rejected: 0, serverTime: new Date().toISOString() });
  }
}
