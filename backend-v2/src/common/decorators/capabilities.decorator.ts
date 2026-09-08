import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiExtension, ApiForbiddenResponse } from "@nestjs/swagger";
export const CAPABILITIES_KEY = "capabilities";
export const RequireCapabilities = (...capabilities: string[]) =>
  applyDecorators(
    SetMetadata(CAPABILITIES_KEY, capabilities),
    ApiExtension("x-required-capabilities", capabilities),
    ApiForbiddenResponse({ description: `Requires capabilities: ${capabilities.join(", ")}` }),
  );
