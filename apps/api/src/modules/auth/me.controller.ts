import { Controller, Get, Headers } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiException } from "../../common/exceptions/api.exception";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser, AuthService } from "./auth.service";

@Controller("me")
export class MeController {
  constructor(private readonly auth: AuthService) {}
  @Get("context")
  async context(@CurrentUser() user: AuthenticatedUser | null, @Headers("x-organization-id") organizationId?: string) {
    if (!user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    return ok(await this.auth.context(user, organizationId));
  }
}
