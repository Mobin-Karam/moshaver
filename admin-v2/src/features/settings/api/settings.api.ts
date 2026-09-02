import { api } from "../../../shared/api/api";
import type { Session } from "../model/settings.types";
export function getSessions() { return api.get<Session[]>("/auth/sessions"); }
export function revokeSession(id: string) { return api.delete(`/auth/sessions/${id}`); }
