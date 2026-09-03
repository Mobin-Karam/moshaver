import { api } from "../../../shared/api/api";

export type AppVersion = {
  app: string;
  version: string;
  updatedAt?: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  actor?: string;
  createdAt: string;
};

export const getAppVersions = () =>
  api.get<AppVersion[]>("/admin/app-versions");

export const updateAppVersion = (
  app: string,
  version: string,
) =>
  api.put(`/admin/app-versions/${app}`, {
    version,
  });

export const getAuditLogs = () =>
  api.get<AuditEntry[]>("/admin/audit");

export const getSessions = () =>
  api.get("/admin/sessions");
