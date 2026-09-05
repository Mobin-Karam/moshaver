import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { UserContext } from "../authorization/authorization.service";
import { AssessmentsService } from "./assessments.service";
import { CreateQuizDto, ModerateRetryDto, QuizQuestionDto, RetryRequestDto, SubmitQuizDto, SyllabusDto, SyllabusProgressDto, UpdateQuizDto } from "./dto/assessment.dto";

@Controller()
export class AssessmentsController {
  constructor(private service:AssessmentsService){}
  private context(u:AuthenticatedUser):UserContext{return {...u,roles:u.roles??[u.role],capabilities:u.capabilities??[],membershipIds:u.membershipIds??[],organizationIds:u.organizationIds??[]};}
  @Post("exams/:id/syllabus") @RequireCapabilities("syllabus.manage") addSyllabus(@Param("id") id:string,@Body() dto:SyllabusDto){return this.service.addSyllabus(id,dto).then(ok);}
  @Delete("syllabus/:id") @RequireCapabilities("syllabus.manage") removeSyllabus(@Param("id") id:string){return this.service.removeSyllabus(id).then(ok);}
  @Put("syllabus/:id/progress") @Roles(UserRole.STUDENT) progress(@CurrentUser() u:AuthenticatedUser,@Param("id") id:string,@Body() dto:SyllabusProgressDto){return this.service.updateProgress(u.id,id,dto).then(ok);}
  @Post("exams/:id/retry-request") @Roles(UserRole.STUDENT) retry(@CurrentUser() u:AuthenticatedUser,@Param("id") id:string,@Body() dto:RetryRequestDto){return this.service.requestRetry(u.id,id,dto.message).then(ok);}
  @Get("exam-attempt-requests") @RequireCapabilities("retry_requests.read") retries(@CurrentUser() u:AuthenticatedUser){return this.service.listRetries(this.context(u)).then(ok);}
  @Patch("exam-attempt-requests/:id") @RequireCapabilities("retry_requests.moderate") moderate(@CurrentUser() u:AuthenticatedUser,@Param("id") id:string,@Body() dto:ModerateRetryDto){return this.service.moderateRetry(this.context(u),u.id,id,dto).then(ok);}
  @Get("quizzes") @RequireCapabilities("quizzes.read") quizzes(){return this.service.listQuizzes().then(ok);}
  @Post("quizzes") @RequireCapabilities("quizzes.create") createQuiz(@Body() dto:CreateQuizDto){return this.service.createQuiz(dto).then(ok);}
  @Patch("quizzes/:id") @RequireCapabilities("quizzes.update") updateQuiz(@Param("id") id:string,@Body() dto:UpdateQuizDto){return this.service.updateQuiz(id,dto).then(ok);}
  @Get("quizzes/history") @Roles(UserRole.STUDENT) history(@CurrentUser() u:AuthenticatedUser){return this.service.history(u.id).then(ok);}
  @Get("quizzes/history/:attemptId") @Roles(UserRole.STUDENT) historyDetail(@CurrentUser() u:AuthenticatedUser,@Param("attemptId") id:string){return this.service.history(u.id,id).then(ok);}
  @Get("quizzes/:id/questions") @RequireCapabilities("quizzes.read") questions(@Param("id") id:string){return this.service.quizQuestions(id).then(ok);}
  @Post("quizzes/:id/questions") @RequireCapabilities("quiz_questions.manage") addQuestion(@Param("id") id:string,@Body() dto:QuizQuestionDto){return this.service.addQuizQuestion(id,dto).then(ok);}
  @Get("quizzes/:id") @Roles(UserRole.STUDENT) quiz(@CurrentUser() u:AuthenticatedUser,@Param("id") id:string){return this.service.studentQuiz(u.id,id).then(ok);}
  @Post("quizzes/:id/start") @Roles(UserRole.STUDENT) start(@CurrentUser() u:AuthenticatedUser,@Param("id") id:string){return this.service.startQuiz(u.id,id).then(ok);}
  @Post("quizzes/:id/attempts") @Roles(UserRole.STUDENT) submit(@CurrentUser() u:AuthenticatedUser,@Param("id") id:string,@Body() dto:SubmitQuizDto){return this.service.submitQuiz(u.id,id,dto).then(ok);}
}
