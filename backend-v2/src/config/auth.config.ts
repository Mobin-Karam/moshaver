export default () => ({
  cookieName: process.env.SESSION_COOKIE_NAME || "moshaver_v2_session",
  cookieSecure: process.env.COOKIE_SECURE === undefined ? process.env.NODE_ENV === "production" : process.env.COOKIE_SECURE === "1",
  cookieSameSite: (process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "none" : "lax")) as "lax" | "strict" | "none",
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "moshaver_v2_refresh",
  loginAttemptWindowMs: Number(process.env.LOGIN_ATTEMPT_WINDOW_MS || 900000),
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 8),
  loginLockMs: Number(process.env.LOGIN_LOCK_MS || 900000),
  signupWindowMs: Number(process.env.SIGNUP_WINDOW_MS || 3600000),
  signupMaxAttempts: Number(process.env.SIGNUP_MAX_ATTEMPTS || 5),
});
