export type DatabaseMeta = { status?: string; database?: string; version?: string; environment?: string; uptimeSeconds?: number; activeSessions?: number; realtimeConnections?: number; sizeBytes?: number };
export type Session = { id: string; current?: boolean; ipAddress?: string; userAgent?: string; lastSeenAt?: string };
export type HistoryRow = Record<string, unknown>;
export type ReleaseDraft = { app: string; version: string; notes: string };
export type PasswordDraft = { currentPassword: string; newPassword: string };
