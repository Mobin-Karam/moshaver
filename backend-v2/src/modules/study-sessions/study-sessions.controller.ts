import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { FinishStudySessionDto } from "./dto/finish-study-session.dto";
import { StartStudySessionDto } from "./dto/start-study-session.dto";
import { StudySessionsService } from "./study-sessions.service";

@Controller("student/study-sessions")
@Roles(UserRole.STUDENT)
export class StudySessionsController {
  constructor(private readonly studySessions: StudySessionsService) {}

  @Post()
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartStudySessionDto) {
    return this.studySessions.start(user.id, dto.taskId).then(ok);
  }

  @Get("active")
  active(@CurrentUser() user: AuthenticatedUser) {
    return this.studySessions.active(user.id).then(ok);
  }

  @Post(":id/heartbeat")
  heartbeat(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.studySessions.heartbeat(user.id, id).then(ok);
  }

  @Post(":id/pause")
  pause(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.studySessions.pause(user.id, id).then(ok);
  }

  @Post(":id/resume")
  resume(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.studySessions.resume(user.id, id).then(ok);
  }

  @Post(":id/finish")
  finish(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: FinishStudySessionDto) {
    return this.studySessions.finish(user.id, id, dto).then(ok);
  }
}