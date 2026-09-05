import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { UserContext } from "../authorization/authorization.service";
import { ImportExportService } from "./import-export.service";

@Controller()
export class ImportExportController {
  constructor(private transfer: ImportExportService) {}
  private context(user: AuthenticatedUser): UserContext { return { ...user, roles: user.roles || [user.role], capabilities: user.capabilities || [], membershipIds: user.membershipIds || [], organizationIds: user.organizationIds || [] }; }
  private payload(body: Record<string, unknown>) { const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data as Record<string, unknown> : body; return { ...data, schemaVersion: String(data.schemaVersion || "2.0"), studentId: body.studentId ? String(body.studentId) : data.studentId ? String(data.studentId) : undefined, organizationId: body.organizationId ? String(body.organizationId) : data.organizationId ? String(data.organizationId) : undefined }; }

  @Get("export/json") @RequireCapabilities("export.read")
  exportData(@CurrentUser() user: AuthenticatedUser, @Query("studentId") studentId?: string, @Query("organizationId") organizationId?: string) { return this.transfer.export(this.context(user), studentId, organizationId).then(ok); }
  @Get("import/template") @RequireCapabilities("import.preview") template() { return ok(this.transfer.template()); }
  @Post("import/preview") @RequireCapabilities("import.preview") preview(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.transfer.preview(this.context(user), this.payload(body)).then(ok); }
  @Post("import/commit") @RequireCapabilities("import.commit") commit(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) { return this.transfer.commit(this.context(user), user.id, this.payload(body)).then(ok); }
  @Get("import/history") @RequireCapabilities("import.preview") history(@CurrentUser() user: AuthenticatedUser) { return this.transfer.history(this.context(user)).then(ok); }
}
