"use strict";
const crypto = require("node:crypto");
const { defineModule } = require("@moshaver/cmb-kernel");
const { normalizeUsername } = require("@moshaver/cmb-identity");
const AUTH_MODULE = defineModule({ id: "auth", version: "0.1.0", kind: "platform", dependencies: ["identity", "kernel"], provides: ["security.sessions"], requires: ["identity.context"], configuration: { accessTokenTtlMinutes: 15, refreshTokenTtlDays: 30 } });
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

class InMemorySessionStore {
  constructor(options = {}) {
    this.credentials = options.credentials ?? new SessionCredentialService(options);
    this.now = options.now ?? Date.now;
    this.sessions = new Map();
    this.inactiveSubjects = new Set();
  }

  create(subjectId, attributes = {}) {
    const subject = String(subjectId ?? "").trim();
    if (!subject) throw new TypeError("Session subjectId is required.");
    if (this.inactiveSubjects.has(subject)) throw new Error("Session subject is inactive.");
    const issued = this.credentials.issue();
    this.sessions.set(this.credentials.hash(issued.accessToken), {
      subjectId: subject,
      csrfToken: issued.csrfToken,
      expiresAt: issued.expiresAt,
      revokedAt: null,
      attributes: Object.freeze({ ...attributes }),
    });
    return issued;
  }

  authenticate(accessToken) {
    const token = String(accessToken ?? "");
    if (!token) return null;
    const session = this.sessions.get(this.credentials.hash(token));
    if (!session || session.revokedAt || session.expiresAt.getTime() <= this.now()) return null;
    if (this.inactiveSubjects.has(session.subjectId)) return null;
    return Object.freeze({ ...session });
  }

  require(accessToken) {
    const session = this.authenticate(accessToken);
    if (!session) throw new Error("Authentication required.");
    return session;
  }

  verifyCsrf(accessToken, receivedToken) {
    const session = this.require(accessToken);
    if (!this.credentials.safeEqual(session.csrfToken, String(receivedToken ?? ""))) throw new Error("Invalid CSRF token.");
    return session;
  }

  revoke(accessToken) {
    const session = this.sessions.get(this.credentials.hash(String(accessToken ?? "")));
    if (!session || session.revokedAt) return false;
    session.revokedAt = new Date(this.now());
    return true;
  }

  deactivateSubject(subjectId) {
    const subject = String(subjectId ?? "").trim();
    if (!subject) throw new TypeError("Session subjectId is required.");
    this.inactiveSubjects.add(subject);
    return [...this.sessions.values()].filter((session) => session.subjectId === subject).length;
  }
}

module.exports = { AUTH_MODULE, SessionCredentialService, InMemorySessionStore };
