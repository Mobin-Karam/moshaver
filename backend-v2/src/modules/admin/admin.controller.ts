import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { PlansService } from "../plans/plans.service";
import { StudentsService } from "../students/students.service";
import { ImportPlanDto } from "../plans/dto/import-plan.dto";

@Controller("admin")
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly students: StudentsService,
    private readonly plans: PlansService,
  ) {}

  @Get("dashboard")
  dashboard() {
    return ok({ studentHealth: [], risk: [], recommendations: [], todayStatus: [] });
  }

  @Get("students")
  listStudents() {
    return this.students.list().then(ok);
  }

  @Get("students/:id")
  getStudent(@Param("id") id: string) {
    return this.students.find(id).then(ok);
  }

  @Post("students")
  createStudent(@Body() body: Parameters<StudentsService["create"]>[0]) {
    return this.students.create(body).then(ok);
  }

  @Patch("students/:id")
  updateStudent(@Param("id") id: string, @Body() body: Parameters<StudentsService["update"]>[1]) {
    return this.students.update(id, body).then(ok);
  }

  @Delete("students/:id")
  deleteStudent(@Param("id") id: string) {
    return this.students.remove(id).then(ok);
  }

  @Get("students/:id/analytics")
  analytics(@Param("id") id: string) {
    return this.students.dashboardForStudent(id).then(ok);
  }

  @Get("students/:id/overview")
  overview(@Param("id") id: string) {
    return this.students.dashboardForStudent(id).then(ok);
  }

  @Get("advisor-inbox")
  advisorInbox(@Query("studentId") studentId?: string) {
    return ok({ studentId: studentId || null, alerts: [], tasks: [], exams: [], messages: [], reports: [] });
  }

  @Get("reports")
  reports(@Query("studentId") studentId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return ok([{ id: "summary", studentId: studentId || null, from: from || null, to: to || null, title: "گزارش خلاصه", status: "empty", items: [] }]);
  }

  @Get("plans")
  listPlans(@Query("studentId") studentId: string, @Query("from") from?: string, @Query("to") to?: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.plans.list(studentId, from || today, to || from || today).then(ok);
  }

  @Post("plans")
  upsertPlan(@Body() dto: ImportPlanDto) {
    return this.plans.upsertPlan(dto).then(ok);
  }

  @Patch("plans/:id")
  updatePlan(@Param("id") id: string, @Body() body: Partial<ImportPlanDto>) {
    return this.plans.updatePlan(id, body).then(ok);
  }

  @Delete("plans/:id")
  deletePlan(@Param("id") id: string) {
    return this.plans.deletePlan(id).then(ok);
  }

  @Post("plans/:id/duplicate")
  duplicatePlan(@Param("id") id: string, @Body() body: { planDate: string }) {
    return this.plans.duplicatePlan(id, body.planDate).then(ok);
  }

  @Post("plans/:id/tasks")
  addTask(@Param("id") id: string, @Body() body: ImportPlanDto["tasks"][number]) {
    return this.plans.addTask(id, body).then(ok);
  }

  @Patch("tasks/:id")
  updateTask(@Param("id") id: string, @Body() body: Partial<ImportPlanDto["tasks"][number]> & { planId?: string }) {
    return this.plans.updateTask(id, body).then(ok);
  }

  @Delete("tasks/:id")
  deleteTask(@Param("id") id: string) {
    return this.plans.deleteTask(id).then(ok);
  }

  @Post("plans/publish-range")
  publishRange(@Body() body: { studentId: string; from: string; to: string; published?: boolean }) {
    return this.plans.publishRange(body.studentId, body.from, body.to, body.published !== false).then(ok);
  }

  @Post("plans/import")
  importPlan(@Body() dto: ImportPlanDto) {
    return this.plans.importPlan(dto).then(ok);
  }

  @Post("plans/import/preview")
  previewPlan(@Body() dto: ImportPlanDto) {
    return this.plans.previewImport(dto).then(ok);
  }

  @Post("import/preview")
  previewPayload(@Body() body: { studentId: string; data?: unknown }) {
    return ok(this.plans.previewPayload(body));
  }

  @Post("import/commit")
  commitPayload(@Body() body: { studentId: string; data?: unknown; publishImported?: boolean }) {
    return this.plans.importPayload(body).then(ok);
  }

  @Post("recommendations")
  recommendations(@Body() body: unknown) {
    return ok({ accepted: true, recommendation: body });
  }
}
