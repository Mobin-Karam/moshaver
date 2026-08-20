import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "../../database/entities/user.entity";
import { ApiException } from "../exceptions/api.exception";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest();
    if (!request.user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    if (!roles.includes(request.user.role)) throw new ApiException(403, "FORBIDDEN", "دسترسی کافی ندارید.");
    return true;
  }
}
