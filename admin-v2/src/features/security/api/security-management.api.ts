import { api } from "../../../shared/api/api";

export const getAdminPermissions = () =>
  api.get("/admin/permissions");

export const getAdminSessions = () =>
  api.get("/admin/sessions");

export const revokeSession = (id:string) =>
  api.delete(`/admin/sessions/${id}`);
