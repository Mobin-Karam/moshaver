import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateExamDto, CreateQuestionDto } from "./dto/create-exam.dto";
import { ExamsService } from "./exams.service";
import { SubmitExamDto } from "./dto/submit-exam.dto";

@Controller()
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

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
    return this.exams.submit(id, dto.answers, user.id).then(ok);
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
