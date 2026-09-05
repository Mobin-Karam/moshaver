import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { StudentsService } from "./students.service";
import { CreateLearningItemDto, ReviewLearningItemDto, UpdateLearningItemDto } from "./dto/learning.dto";

@Controller("student")
@Roles(UserRole.STUDENT)
export class StudentController {
  constructor(private readonly students: StudentsService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.students.dashboard(user?.id).then(ok);
  }

  @Get("today")
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.students.today(user?.id).then(ok);
  }

  @Get("plans")
  plans(@CurrentUser() user: AuthenticatedUser, @Query("date") date?: string) {
    return this.students.day(user?.id, date).then((data) => ok(data.plan ? [data.plan] : []));
  }

  @Get("progress")
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.students.progress(user?.id).then(ok);
  }

  @Get("progress/weekly")
  weeklyProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.students.progress(user?.id).then(ok);
  }

  @Get("reviews")
  reviews(@CurrentUser() user: AuthenticatedUser) {
    return this.students.reviews(user?.id).then(ok);
  }

  @Get("learning/summary")
  learningSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.students.learning(user?.id).then((data) => ok(data.summary));
  }

  @Get("learning/items")
  learningItems(@CurrentUser() user: AuthenticatedUser) {
    return this.students.learning(user?.id).then((data) => ok(data.items));
  }
}

@Controller()
@Roles(UserRole.STUDENT)
export class StudentParityController {
  constructor(private readonly students: StudentsService) {}

  @Get("reviews")
  reviews(@CurrentUser() user: AuthenticatedUser) {
    return this.students.reviews(user?.id).then(ok);
  }

  @Get("progress/weekly")
  weeklyProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.students.progress(user?.id).then(ok);
  }

  @Get("learning/summary")
  learningSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.students.learning(user?.id).then((data) => ok(data.summary));
  }

  @Get("learning/items")
  learningItems(@CurrentUser() user: AuthenticatedUser) {
    return this.students.learning(user?.id).then((data) => ok(data.items));
  }

  @Post("learning/items")
  async createLearning(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLearningItemDto) { return ok(await this.students.createLearningItem(await this.students.studentIdForUser(user.id), dto)); }

  @Patch("learning/items/:id")
  async updateLearning(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateLearningItemDto) { return ok(await this.students.updateLearningItem(await this.students.studentIdForUser(user.id), id, dto)); }

  @Delete("learning/items/:id")
  async deleteLearning(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return ok(await this.students.deleteLearningItem(await this.students.studentIdForUser(user.id), id)); }

  @Post("learning/items/:id/review")
  async reviewLearning(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReviewLearningItemDto) { return ok(await this.students.reviewLearningItem(await this.students.studentIdForUser(user.id), id, dto.rating)); }

  @Get("learning/items/:id/reviews")
  async learningHistory(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return ok(await this.students.learningReviewHistory(await this.students.studentIdForUser(user.id), id)); }
}

@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get("me")
  @Roles(UserRole.STUDENT)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.students.find(user.id).then(ok);
  }
}
