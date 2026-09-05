import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { UserContext } from "../authorization/authorization.service";
import { ActivityService } from "./activity.service";
@Controller()
export class ActivityController {
  constructor(private activity: ActivityService) {}
  private context(u: AuthenticatedUser): UserContext {
    return {
      ...u,
      roles: u.roles || [u.role],
      capabilities: u.capabilities || [],
      membershipIds: u.membershipIds || [],
      organizationIds: u.organizationIds || [],
    };
  }
  @Put("student/presence/heartbeat") @Roles(UserRole.STUDENT) heartbeat(
    @CurrentUser() u: AuthenticatedUser,
    @Body() b: { state?: string; currentTaskId?: string | null },
  ) {
    return this.activity.heartbeat(u.id, b).then(ok);
  }
  @Post("student/activity") @Roles(UserRole.STUDENT) record(
    @CurrentUser() u: AuthenticatedUser,
    @Body()
    b: {
      type: string;
      resourceType?: string;
      resourceId?: string;
      data?: Record<string, unknown>;
    },
  ) {
    return this.activity.record(u.id, b).then(ok);
  }
  @Get("students/:id/activity")
  @RequireCapabilities("student.activity.read")
  history(
    @CurrentUser() u: AuthenticatedUser,
    @Param("id") id: string,
    @Query("limit") limit?: string,
  ) {
    return this.activity
      .history(this.context(u), id, Number(limit || 50))
      .then(ok);
  }
  @Get("live") @RequireCapabilities("student.live.read") live(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.activity.live(this.context(u)).then(ok);
  }
  @Get("attention") @RequireCapabilities("student.live.read") attention(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.activity.attentionList(this.context(u)).then(ok);
  }
}
