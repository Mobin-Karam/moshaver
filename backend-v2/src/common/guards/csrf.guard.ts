import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "../../modules/auth/auth.service";
import { ApiException } from "../exceptions/api.exception";

const mutating = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!mutating.has(request.method) || request.url.endsWith("/auth/logout")) return true;
    if (!request.user?.sessionId) return true;
    const token = request.headers["x-csrf-token"];
    if (!token || typeof token !== "string" || !(await this.auth.verifyCsrf(request.user.sessionId, token))) {
      throw new ApiException(403, "CSRF", "نشست امنیتی منقضی شده است.");
    }
    return true;
  }
}
