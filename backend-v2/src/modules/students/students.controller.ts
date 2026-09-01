import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { StudentsService } from "./students.service";

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
