import { Body, Controller, Delete, Get, Param, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiException } from "../../common/exceptions/api.exception";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser, AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.auth.login(dto.username, dto.password);
    res.setCookie(this.config.get<string>("cookieName", "moshaver_v2_session"), result.token, {
      path: "/",
      httpOnly: true,
      secure: this.config.get<boolean>("cookieSecure", false),
      sameSite: this.config.get<"lax" | "strict" | "none">("cookieSameSite", "lax"),
      expires: result.expiresAt,
    });
    return ok({ user: { id: result.user.id, username: result.user.username, role: result.user.role }, csrfToken: result.csrfToken, expiresAt: result.expiresAt });
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser | null) {
    if (!user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    return ok(await this.auth.me(user));
  }

  @Post("change-password")
  async changePassword(@CurrentUser() user: AuthenticatedUser | null, @Body() dto: ChangePasswordDto) {
    if (!user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    return this.auth.changePassword(user, dto.currentPassword, dto.newPassword).then(ok);
  }

  @Post("logout")
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const cookieName = this.config.get<string>("cookieName", "moshaver_v2_session");
    await this.auth.logout(req.cookies?.[cookieName]);
    res.clearCookie(cookieName, { path: "/" });
    return ok({ loggedOut: true });
  }

  @Get("sessions")
  async sessions(@CurrentUser() user: AuthenticatedUser | null) {
    if (!user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    return this.auth.listSessions(user).then(ok);
  }

  @Delete("sessions/:id")
  async revokeSession(@CurrentUser() user: AuthenticatedUser | null, @Param("id") id: string) {
    if (!user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    return this.auth.revokeSession(user, id).then(ok);
  }
}
