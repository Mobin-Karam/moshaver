import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ApiException } from "../../common/exceptions/api.exception";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { AuthorizationService, UserContext } from "../authorization/authorization.service";
import { ImportPlanDto } from "./dto/import-plan.dto";
import { PlansService } from "./plans.service";

@Controller()
export class StaffPlansController {
  constructor(private readonly plans: PlansService, private readonly authorization: AuthorizationService) {}
  private context(user: AuthenticatedUser): UserContext { return { ...user, roles: user.roles || [user.role], capabilities: user.capabilities || [], membershipIds: user.membershipIds || [], organizationIds: user.organizationIds || [] }; }
  private async student(user: AuthenticatedUser, id: string, capability: string) { if (!await this.authorization.canAccessStudent(this.context(user), id, capability)) throw new ApiException(404, "NOT_FOUND", "دانش‌آموز یافت نشد."); }
  private async plan(user: AuthenticatedUser, id: string, capability: string) { await this.student(user, await this.plans.studentIdForPlan(id), capability); }
  private async task(user: AuthenticatedUser, id: string, capability: string) { await this.student(user, await this.plans.studentIdForTask(id), capability); }

  @Get("plans") @RequireCapabilities("plans.read") async list(@CurrentUser() user: AuthenticatedUser, @Query("studentId") studentId: string, @Query("from") from?: string, @Query("to") to?: string, @Query("date") date?: string) { await this.student(user, studentId, "plans.read"); const start = date || from || new Date().toISOString().slice(0, 10); return ok(await this.plans.list(studentId, start, date || to || start)); }
  @Post("plans") @RequireCapabilities("plans.create") async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: ImportPlanDto) { await this.student(user, dto.studentId, "plans.create"); return ok(await this.plans.upsertPlan(dto)); }
  @Patch("plans/:id") @RequireCapabilities("plans.update") async update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: Partial<ImportPlanDto>) { await this.plan(user, id, "plans.update"); return ok(await this.plans.updatePlan(id, body)); }
  @Delete("plans/:id") @RequireCapabilities("plans.delete") async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { await this.plan(user, id, "plans.delete"); return ok(await this.plans.deletePlan(id)); }
  @Post("plans/:id/duplicate") @RequireCapabilities("plans.create") async duplicate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body("planDate") date: string) { await this.plan(user, id, "plans.read"); return ok(await this.plans.duplicatePlan(id, date)); }
  @Post("plans/:id/tasks") @RequireCapabilities("tasks.create") async addTask(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: ImportPlanDto["tasks"][number]) { await this.plan(user, id, "tasks.create"); return ok(await this.plans.addTask(id, body)); }
  @Patch("tasks/:id") @RequireCapabilities("tasks.update") async updateTask(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: Partial<ImportPlanDto["tasks"][number]> & { planId?: string }) { await this.task(user, id, "tasks.update"); if (body.planId) await this.plan(user, body.planId, "tasks.update"); return ok(await this.plans.updateTask(id, body)); }
  @Delete("tasks/:id") @RequireCapabilities("tasks.delete") async removeTask(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { await this.task(user, id, "tasks.delete"); return ok(await this.plans.deleteTask(id)); }
  @Post("plans/publish-range") @RequireCapabilities("plans.publish") async publish(@CurrentUser() user: AuthenticatedUser, @Body() body: { studentId: string; from: string; to: string; published?: boolean }) { await this.student(user, body.studentId, "plans.publish"); return ok(await this.plans.publishRange(body.studentId, body.from, body.to, body.published !== false)); }
}
