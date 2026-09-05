import { api } from "../../../shared/api/api";
import type { RoleCode } from "../../../shared/types/domain";

export type PortalUser = { id: string; username: string; firstName?: string; lastName?: string; status: string; assignments: Array<{ role: RoleCode; organizationId: string | null }> };
export type PortalOrganization = { id: string; name: string; type: string; status: string };

export const listUsers = (organizationId?: string) => api.get<PortalUser[]>(`/users${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""}`);
export const createUser = (body: { username: string; password: string; firstName?: string; lastName?: string; organizationId?: string; roleCodes: RoleCode[] }) => api.post<PortalUser>("/users", body);
export const setUserActive = (id: string, active: boolean) => api.post(`/users/${id}/${active ? "activate" : "deactivate"}`, {});
export const listOrganizations = () => api.get<PortalOrganization[]>("/organizations");
export const createOrganization = (body: { name: string; type: string }) => api.post<PortalOrganization>("/organizations", body);
