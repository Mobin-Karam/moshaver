import type { User } from "../../../shared/types/domain";

export const AUTH_SIGNAL_KEY = "moshaver_admin_auth_signal";
export const PENDING_LOGOUT_KEY = "moshaver_admin_logout_pending";

export function normalizeUser(user: User): User {
  return {
    ...user,
    role: user.role.toLowerCase() as User["role"],
  };
}

export function signalAuthEvent(kind: "login" | "logout") {
  try {
    localStorage.setItem(
      AUTH_SIGNAL_KEY,
      JSON.stringify({ kind, at: Date.now() }),
    );
  } catch {
    /* Storage may be unavailable. */
  }
}
