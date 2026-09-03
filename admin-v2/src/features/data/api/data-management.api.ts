import { api } from "../../../shared/api/api";

export const createBackup = () =>
  api.post("/admin/database/backup");

export const restoreBackup = (id:string) =>
  api.post(`/admin/database/restore/${id}`);

export const exportData = (type:string) =>
  api.get(`/admin/export/${type}`);

export const importData = (
  type:string,
  payload:unknown,
) =>
  api.post(`/admin/import/${type}`, payload);
