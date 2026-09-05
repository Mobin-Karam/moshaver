export default () => ({
  cookieName: process.env.SESSION_COOKIE_NAME || "moshaver_v2_session",
  cookieSecure: process.env.COOKIE_SECURE === undefined ? process.env.NODE_ENV === "production" : process.env.COOKIE_SECURE === "1",
  cookieSameSite: (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "none" : "lax")) as "lax" | "strict" | "none",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 168),
  loginAttemptWindowMs: Number(process.env.LOGIN_ATTEMPT_WINDOW_MS || 900000),
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 8),
  loginLockMs: Number(process.env.LOGIN_LOCK_MS || 900000),
});
