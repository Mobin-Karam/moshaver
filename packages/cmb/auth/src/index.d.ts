export const AUTH_MODULE: Readonly<{ id: "auth"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export type SessionCredentials = { accessToken: string; refreshToken: string; csrfToken: string; expiresAt: Date; refreshExpiresAt: Date };
export class SessionCredentialService { constructor(options?: { accessTokenTtlMinutes?: number; refreshTokenTtlDays?: number; now?: () => number }); normalizeLogin(username: unknown): string; issue(): SessionCredentials; hash(value: string): string; safeEqual(expectedValue: string, receivedValue: string): boolean }
