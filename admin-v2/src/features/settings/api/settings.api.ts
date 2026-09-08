import { api } from "../../../shared/api/api";
import type { Session } from "../model/settings.types";
import type { PasswordDraft } from "../../system/model/system.types";
export function getSessions() {
  return api.get<Session[]>("/auth/sessions");
}
export function revokeSession(id: string) {
  return api.delete(`/auth/sessions/${id}`);
}
export function changePassword(body: PasswordDraft) {
  return api.post("/auth/change-password", {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });
}
