export type DatabaseMeta = {
  engine: string;
  status: string;
  sizeBytes: number;
  path: string;
  migrations: number;
  remoteRestoreEnabled: boolean;
};
export type Session = {
  id: string;
  current?: boolean;
  ipAddress?: string;
  userAgent?: string;
  lastSeenAt?: string;
};
export type HistoryRow = Record<string, unknown>;
export type ServiceHealth = { service: string; status: string };
export type Readiness = { database: string };
export type ReleaseDraft = { app: string; version: string; notes: string };
export type PasswordDraft = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
