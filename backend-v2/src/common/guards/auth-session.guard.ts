import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const cookieName = this.config.get<string>("cookieName", "moshaver_v2_session");
    const token = request.cookies?.[cookieName] || this.cookieFromHeader(request.headers.cookie, cookieName);
    request.user = await this.auth.userFromToken(token);
    return true;
  }

  private cookieFromHeader(header: string | undefined, name: string) {
    return (header || "")
      .split(";")
      .map((part) => part.trim())
      .map((part) => part.split("="))
      .find(([key]) => key === name)?.[1];
  }
}
