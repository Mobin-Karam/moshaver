import { Body, Controller, Get, Param, Post, Put, StreamableFile } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { SystemService } from "./system.service";
@Controller()
export class SystemController {
  constructor(private system: SystemService) {}
  @Get("public/app-version/:app") version(@Param("app") app: string) { return this.system.publicVersion(app).then(ok); }
  @Get("app-versions") @RequireCapabilities("release.read") versions() { return this.system.listVersions().then(ok); }
  @Put("app-versions/:app") @RequireCapabilities("release.manage") setVersion(@Param("app") app: string, @Body() body: {version:string;notes?:string}) { return this.system.updateVersion(app, body).then(ok); }
  @Get("app-releases") @RequireCapabilities("release.read") releases() { return this.system.listReleases().then(ok); }
  @Put("app-releases/:app") @RequireCapabilities("release.manage") setRelease(@Param("app") app: string, @Body() body: {version:string;notes?:string}) { return this.system.updateRelease(app, body).then(ok); }
  @Get("audit") @RequireCapabilities("audit.read") audit() { return this.system.auditLogs().then(ok); }
  @Get("system/database") @RequireCapabilities("database.read") database() { return this.system.metadata().then(ok); }
  @Post("system/database-backup") @RequireCapabilities("database.backup") async backup(@CurrentUser() user: AuthenticatedUser) { const file = await this.system.backup(user.id); return new StreamableFile(file.buffer, { type: "application/vnd.sqlite3", disposition: `attachment; filename="${file.filename}"` }); }
  @Post("system/database-restore") @RequireCapabilities("database.restore") restore(@CurrentUser() user: AuthenticatedUser, @Body() body: Buffer) { return this.system.restore(user.id, body).then(ok); }
}
