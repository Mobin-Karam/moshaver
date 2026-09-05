import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiException } from "../exceptions/api.exception";
import { CAPABILITIES_KEY } from "../decorators/capabilities.decorator";

@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(
      CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user)
      throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    if (!required.every((item) => user.capabilities?.includes(item)))
      throw new ApiException(403, "FORBIDDEN", "دسترسی کافی ندارید.");
    return true;
  }
}
