import { Controller, Get, Param, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string, @Query("cursor") cursor?: string, @Query("unreadOnly") unreadOnly?: string, @Query("category") category?: string) {
    return this.notifications.findForUser(user.id, { limit: Number(limit), cursor, unreadOnly: unreadOnly === "true", category }).then(ok);
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
