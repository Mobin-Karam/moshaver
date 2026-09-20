export const AUTH_MODULE: Readonly<{ id: "auth"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export type SessionCredentials = { accessToken: string; refreshToken: string; csrfToken: string; expiresAt: Date; refreshExpiresAt: Date };
export class SessionCredentialService { constructor(options?: { accessTokenTtlMinutes?: number; refreshTokenTtlDays?: number; now?: () => number }); normalizeLogin(username: unknown): string; issue(): SessionCredentials; hash(value: string): string; safeEqual(expectedValue: string, receivedValue: string): boolean }
export type CmbSession<TAttributes extends object = Record<string, unknown>> = Readonly<{ subjectId: string; csrfToken: string; expiresAt: Date; revokedAt: Date | null; attributes: Readonly<TAttributes> }>;
export class InMemorySessionStore<TAttributes extends object = Record<string, unknown>> {
  constructor(options?: { credentials?: SessionCredentialService; accessTokenTtlMinutes?: number; refreshTokenTtlDays?: number; now?: () => number });
  create(subjectId: string, attributes?: TAttributes): SessionCredentials;
  authenticate(accessToken: string): CmbSession<TAttributes> | null;
  require(accessToken: string): CmbSession<TAttributes>;
  verifyCsrf(accessToken: string, receivedToken: string): CmbSession<TAttributes>;
  revoke(accessToken: string): boolean;
  deactivateSubject(subjectId: string): number;
}
