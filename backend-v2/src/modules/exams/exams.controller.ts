import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { AssignExamDto, CreateExamDto, CreateQuestionDto } from "./dto/create-exam.dto";
import { ExamsService } from "./exams.service";
import { SubmitExamDto } from "./dto/submit-exam.dto";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { AuthorizationService, UserContext } from "../authorization/authorization.service";
import { ApiException } from "../../common/exceptions/api.exception";

@Controller()
export class ExamsController {
  constructor(private readonly exams: ExamsService, private readonly authorization: AuthorizationService) {}

  private context(user: AuthenticatedUser): UserContext { return { ...user, roles: user.roles ?? [user.role], capabilities: user.capabilities ?? [], membershipIds: user.membershipIds ?? [], organizationIds: user.organizationIds ?? [] }; }

  @Get("exams")
  @RequireCapabilities("exams.read")
  listCanonical(@CurrentUser() user: AuthenticatedUser) { const context=this.context(user); return this.exams.listScoped(context.organizationIds,context.roles.includes("PLATFORM_ADMIN")).then(ok); }

  @Post("exams")
  @RequireCapabilities("exams.create")
  async createCanonical(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExamDto) {
    const context = this.context(user);
    const organizationId = dto.organizationId ?? (context.organizationIds.length === 1 ? context.organizationIds[0] : undefined);
    if (!context.roles.includes("PLATFORM_ADMIN") && (!organizationId || !this.authorization.canAccessOrganization(context, organizationId, "exams.create"))) throw new ApiException(403, "ORGANIZATION_FORBIDDEN", "به این سازمان دسترسی ندارید.");
    if (dto.studentId && !await this.authorization.canAccessStudent(context,dto.studentId,"exams.assign")) throw new ApiException(403,"STUDENT_FORBIDDEN","به این دانش‌آموز دسترسی ندارید.");
    const exam=await this.exams.create({...dto,organizationId}, user.id);
    if(dto.studentId)await this.exams.assign(exam.id,[dto.studentId],user.id);
    return ok(exam);
  }

  @Patch("exams/:id")
  @RequireCapabilities("exams.update")
  async updateCanonical(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateExamDto) { await this.requireExamScope(user,id,"exams.update"); return this.exams.update(id, { ...dto }).then(ok); }

  @Delete("exams/:id")
  @RequireCapabilities("exams.delete")
  async removeCanonical(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { await this.requireExamScope(user,id,"exams.delete"); return this.exams.remove(id).then(ok); }

  @Get("exams/:id/questions") @RequireCapabilities("questions.read") async questionsCanonical(@CurrentUser() user:AuthenticatedUser,@Param("id")id:string){await this.requireExamScope(user,id,"questions.read");return this.exams.questionsForExam(id).then(ok)}
  @Post("exams/:id/questions") @RequireCapabilities("questions.create") async addQuestionCanonical(@CurrentUser() user:AuthenticatedUser,@Param("id")id:string,@Body()dto:CreateQuestionDto){await this.requireExamScope(user,id,"questions.create");return this.exams.addQuestion(id,dto).then(ok)}
  @Patch("questions/:id") @RequireCapabilities("questions.update") async updateQuestionCanonical(@CurrentUser() user:AuthenticatedUser,@Param("id")id:string,@Body()dto:CreateQuestionDto){await this.requireExamScope(user,await this.exams.examIdForQuestion(id),"questions.update");return this.exams.updateQuestion(id,{...dto}).then(ok)}
  @Delete("exams/:examId/questions/:id") @RequireCapabilities("questions.delete") async deleteQuestionCanonical(@CurrentUser() user:AuthenticatedUser,@Param("examId")examId:string,@Param("id")id:string){await this.requireExamScope(user,examId,"questions.delete");return this.exams.deleteQuestion(id,examId).then(ok)}

  @Post("exams/:id/assignments")
  @RequireCapabilities("exams.assign")
  async assign(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AssignExamDto) {
    for (const studentId of dto.studentIds) if (!await this.authorization.canAccessStudent(this.context(user), studentId, "exams.assign")) throw new ApiException(403, "STUDENT_FORBIDDEN", "به یکی از دانش‌آموزان دسترسی ندارید.");
    return ok(await this.exams.assign(id, dto.studentIds, user.id));
  }

  @Delete("exams/:id/assignments/:studentId")
  @RequireCapabilities("exams.assign")
  async unassign(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("studentId") studentId: string) {
    if (!await this.authorization.canAccessStudent(this.context(user), studentId, "exams.assign")) throw new ApiException(403, "STUDENT_FORBIDDEN", "به این دانش‌آموز دسترسی ندارید.");
    return ok(await this.exams.unassign(id, studentId));
  }

  private async requireExamScope(user:AuthenticatedUser,id:string,capability:string){const context=this.context(user);const organizationId=await this.exams.organizationIdForExam(id);if(context.roles.includes("PLATFORM_ADMIN"))return;if(!organizationId||!this.authorization.canAccessOrganization(context,organizationId,capability))throw new ApiException(404,"NOT_FOUND","آزمون یافت نشد.")}

  @Get("student/exams")
  @Roles(UserRole.STUDENT)
  listForStudent(@CurrentUser() user: AuthenticatedUser) {
    return this.exams.listForStudent(user.id).then(ok);
  }

  @Get("student/exams/attempts")
  @Roles(UserRole.STUDENT)
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.exams.history(user.id).then(ok);
  }

  @Get("student/exams/:id/progress")
  @Roles(UserRole.STUDENT)
  progress(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.progress(id, user.id).then(ok);
  }

  @Get("student/exams/:id")
  @Roles(UserRole.STUDENT)
  detail(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.detail(id, user.id).then(ok);
  }

  @Patch("student/exams/attempts/:id")
  @Roles(UserRole.STUDENT)
  saveProgress(@Param("id") id: string, @Body() dto: SubmitExamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.saveProgress(id, dto.answers, user.id).then(ok);
  }

  @Post("student/exams/:id/start")
  @Roles(UserRole.STUDENT)
  start(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.start(id, user.id).then(ok);
  }

  @Post("student/exams/:id/submit")
  @Roles(UserRole.STUDENT)
  submit(@Param("id") id: string, @Body() dto: SubmitExamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.submitExam(id, dto.answers, user.id).then(ok);
  }

  @Post("admin/exams")
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateExamDto) {
    return this.exams.create(dto).then(ok);
  }

  @Get("admin/exams")
  @Roles(UserRole.ADMIN)
  listForAdmin(@Query("studentId") _studentId?: string) {
    return this.exams.list().then(ok);
  }

  @Patch("admin/exams/:id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.exams.update(id, body).then(ok);
  }

  @Delete("admin/exams/:id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.exams.remove(id).then(ok);
  }

  @Get("admin/exams/:id/questions")
  @Roles(UserRole.ADMIN)
  listQuestions(@Param("id") id: string) {
    return this.exams.questionsForExam(id).then(ok);
  }

  @Post("admin/exams/:id/questions")
  @Roles(UserRole.ADMIN)
  addQuestion(@Param("id") id: string, @Body() dto: CreateQuestionDto & { question?: string; correctOption?: string }) {
    return this.exams.addQuestion(id, dto).then(ok);
  }

  @Patch("admin/questions/:id")
  @Roles(UserRole.ADMIN)
  updateQuestion(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.exams.updateQuestion(id, body).then(ok);
  }

  @Delete("admin/questions/:id")
  @Roles(UserRole.ADMIN)
  deleteQuestion(@Param("id") id: string) {
    return this.exams.deleteQuestion(id).then(ok);
  }

  @Delete("admin/exams/:examId/questions/:id")
  @Roles(UserRole.ADMIN)
  deleteExamQuestion(@Param("examId") examId: string, @Param("id") id: string) {
    return this.exams.deleteQuestion(id, examId).then(ok);
  }

  @Get("admin/students/:studentId/attempts")
  @Roles(UserRole.ADMIN)
  studentAttempts(@Param("studentId") studentId: string) {
    return this.exams.historyForStudent(studentId).then(ok);
  }

  @Get("admin/students/:studentId/attempts/:attemptId")
  @Roles(UserRole.ADMIN)
  studentAttempt(
    @Param("studentId") studentId: string,
    @Param("attemptId") attemptId: string,
  ) {
    return this.exams.attemptForStudent(studentId, attemptId).then(ok);
  }

  @Post("admin/questions/import")
  @Roles(UserRole.ADMIN)
  importQuestions(@Body() body: { examId: string; questions: CreateQuestionDto[] }) {
    return this.exams.importQuestions(body.examId, body.questions).then(ok);
  }
}
