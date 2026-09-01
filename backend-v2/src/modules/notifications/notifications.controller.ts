import { Controller, Get, Param, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@Roles(UserRole.STUDENT)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string) {
    return this.notifications.list(user, Number(limit)).then(ok);
  }

  @Put(":id/read")
  read(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notifications.markRead(user, id).then(ok);
  }

  @Put("read-all")
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user).then(ok);
  }
}