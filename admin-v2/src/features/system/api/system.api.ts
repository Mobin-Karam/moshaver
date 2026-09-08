import { api } from "../../../shared/api/api";
import type {
  DatabaseMeta,
  HistoryRow,
  PasswordDraft,
  ReleaseDraft,
  Readiness,
  ServiceHealth,
  Session,
} from "../model/system.types";
export const getDatabaseMeta = () => api.get<DatabaseMeta>("/system/database");
export const getServiceHealth = () => api.get<ServiceHealth>("/health");
export const getReadiness = () => api.get<Readiness>("/ready");
export const getSessions = () => api.get<Session[]>("/auth/sessions");
export const getImportHistory = () => api.get<HistoryRow[]>("/import/history");
export const getReleases = () => api.get<HistoryRow[]>("/app-releases");
export const getAudit = () => api.get<HistoryRow[]>("/audit");
export const restoreDatabase = (file: File) => api.uploadBinary("/system/database-restore", file);
export const changeAdminPassword = (body: PasswordDraft) =>
  api.post("/auth/change-password", {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });
export const saveAppRelease = (release: ReleaseDraft) =>
  api.put(`/app-releases/${encodeURIComponent(release.app)}`, {
    version: release.version,
    notes: release.notes,
  });
export type AppVersion = { app: string; version: string; notes: string; updatedAt: string };
export const getAppVersions = () => api.get<AppVersion[]>("/app-versions");
export const saveAppVersion = (app: string, body: { version: string; notes: string }) =>
  api.put<AppVersion>(`/app-versions/${encodeURIComponent(app)}`, body);
export const downloadDatabaseBackup = () => api.download("/system/database-backup");
