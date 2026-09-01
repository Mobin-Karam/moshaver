import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CompleteTaskDto } from "./dto/complete-task.dto";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { CreateTaskIssueDto } from "./dto/create-task-issue.dto";
import { TasksService } from "./tasks.service";

@Controller("student/tasks")
@Roles(UserRole.STUDENT)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get(":id")
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tasks.detail(user.id, id).then(ok);
  }

  @Post(":id/complete")
  complete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CompleteTaskDto) {
    return this.tasks.complete(user.id, id, dto).then(ok);
  }

  @Post(":id/comments")
  comment(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateTaskCommentDto) {
    return this.tasks.addComment(user.id, id, dto).then(ok);
  }

  @Post(":id/issues")
  issue(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateTaskIssueDto) {
    return this.tasks.reportIssue(user.id, id, dto).then(ok);
  }
}