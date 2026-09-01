import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { MistakesService } from "./mistakes.service";

@Controller(["mistakes", "student/mistakes"])
@Roles(UserRole.STUDENT)
export class MistakesController {
  constructor(private readonly mistakes: MistakesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string) {
    return this.mistakes.list(user.id, limit).then(ok);
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.mistakes.detail(user.id, id).then(ok);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: { reason?: string; resolved?: boolean }) {
    return this.mistakes.update(user.id, id, body).then(ok);
  }
}