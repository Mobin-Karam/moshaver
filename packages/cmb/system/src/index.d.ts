export const SYSTEM_MODULE: Readonly<{ id: "system"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export const APP_VERSION_PATTERN: RegExp;
export function isValidAppVersion(value: unknown): boolean;
export function projectAuditRecord<TDate, TMetadata>(record: { id: string; action: string; entity: string; actorUserId?: string | null; metadata?: TMetadata | null; createdAt: TDate }): { id: string; action: string; entity: string; actorUserId: string | null; metadata: TMetadata | null; createdAt: TDate };
