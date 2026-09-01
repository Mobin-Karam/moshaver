import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateDailyReportDto } from "./dto/create-daily-report.dto";
import { CreateRecoveryRequestDto } from "./dto/create-recovery-request.dto";
import { ReportsService } from "./reports.service";

@Controller()
@Roles(UserRole.STUDENT)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post("reports")
  saveReport(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDailyReportDto) {
    return this.reports.saveReport(user.id, dto).then(ok);
  }

  @Get("reports")
  listReports(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string) {
    return this.reports.listReports(user.id, limit).then(ok);
  }

  @Post("recovery-requests")
  createRecovery(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecoveryRequestDto) {
    return this.reports.createRecovery(user.id, dto).then(ok);
  }

  @Get("recovery-requests")
  listRecovery(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.listRecovery(user.id).then(ok);
  }
}