import type { RoleCode, User } from "../../../shared/types/domain";

export const AUTH_SIGNAL_KEY = "moshaver_admin_auth_signal";
export const PENDING_LOGOUT_KEY = "moshaver_admin_logout_pending";

export const ADMIN_PORTAL_ROLES = [
  "GUARDIAN",
  "ADVISOR",
  "TEACHER",
  "MENTOR",
  "CONTENT_MANAGER",
  "ORGANIZATION_ADMIN",
  "PLATFORM_ADMIN",
] as const satisfies readonly RoleCode[];

export function adminPortalRole(roles: readonly RoleCode[]) {
  return (
    roles.find((role) =>
      ADMIN_PORTAL_ROLES.includes(role as (typeof ADMIN_PORTAL_ROLES)[number]),
    ) ?? null
  );
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    role: user.role.toLowerCase() as User["role"],
  };
}

export function signalAuthEvent(kind: "login" | "logout") {
  try {
    localStorage.setItem(AUTH_SIGNAL_KEY, JSON.stringify({ kind, at: Date.now() }));
  } catch {
    /* Storage may be unavailable. */
  }
}
