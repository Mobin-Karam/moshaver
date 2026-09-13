"use strict";
const crypto = require("node:crypto");
const { defineModule } = require("@moshaver/cmb-kernel");
const { normalizeUsername } = require("@moshaver/cmb-identity");
const AUTH_MODULE = defineModule({ id: "auth", version: "0.1.0", kind: "platform", dependencies: ["identity", "kernel"] });
class SessionCredentialService {
  constructor(options = {}) {
    this.accessTokenTtlMinutes = Number(options.accessTokenTtlMinutes ?? 15);
    this.refreshTokenTtlDays = Number(options.refreshTokenTtlDays ?? 30);
    this.now = options.now ?? Date.now;
    if (!(this.accessTokenTtlMinutes > 0) || !(this.refreshTokenTtlDays > 0)) throw new TypeError("Session credential TTL values must be positive.");
  }
  normalizeLogin(username) { return normalizeUsername(username); }
  issue() { const now = this.now(); return { accessToken: crypto.randomBytes(32).toString("base64url"), refreshToken: crypto.randomBytes(48).toString("base64url"), csrfToken: crypto.randomBytes(24).toString("base64url"), expiresAt: new Date(now + this.accessTokenTtlMinutes * 60 * 1000), refreshExpiresAt: new Date(now + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000) }; }
  hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
  safeEqual(expectedValue, receivedValue) { const expected = Buffer.from(expectedValue); const received = Buffer.from(receivedValue); return expected.length === received.length && crypto.timingSafeEqual(expected, received); }
}
module.exports = { AUTH_MODULE, SessionCredentialService };
