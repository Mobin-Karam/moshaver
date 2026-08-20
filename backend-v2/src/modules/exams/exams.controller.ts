import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateExamDto, CreateQuestionDto } from "./dto/create-exam.dto";
import { ExamsService } from "./exams.service";

@Controller()
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get("student/exams")
  @Roles(UserRole.STUDENT)
  listForStudent() {
    return this.exams.list(false).then(ok);
  }

  @Post("student/exams/:id/start")
  @Roles(UserRole.STUDENT)
  start(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.start(id, user.id).then(ok);
  }

  @Post("student/exams/:id/submit")
  @Roles(UserRole.STUDENT)
  submit(@Param("id") id: string, @Body("answers") answers: Array<{ questionId: string; selectedOption?: string | null }> = []) {
    return this.exams.submit(id, answers).then(ok);
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

  @Post("admin/questions/import")
  @Roles(UserRole.ADMIN)
  importQuestions(@Body() body: { examId: string; questions: CreateQuestionDto[] }) {
    return this.exams.importQuestions(body.examId, body.questions).then(ok);
  }
}
