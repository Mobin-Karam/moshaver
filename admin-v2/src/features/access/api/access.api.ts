import { api } from "../../../shared/api/api";
import type { RoleCode } from "../../../shared/types/domain";

export type PortalUser = { id: string; username: string; firstName?: string; lastName?: string; status: string; assignments: Array<{ role: RoleCode; organizationId: string | null }> };
export type PortalOrganization = { id: string; name: string; type: string; status: string };
export type OrganizationMember = { id: string; user: Pick<PortalUser,"id"|"username"|"firstName"|"lastName"|"status">; status: string; roles: RoleCode[] };
export type UserRelationship = { id:string; type:string; status:string; fromUser:Pick<PortalUser,"id"|"username"|"firstName"|"lastName">; student:{id:string;name:string}; organizationId?:string; createdAt:string };

export const listUsers = (organizationId?: string) => api.get<PortalUser[]>(`/users${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""}`);
export const createUser = (body: { username: string; password: string; firstName?: string; lastName?: string; organizationId?: string; roleCodes: RoleCode[] }) => api.post<PortalUser>("/users", body);
export const setUserActive = (id: string, active: boolean) => api.post(`/users/${id}/${active ? "activate" : "deactivate"}`, {});
export const listOrganizations = () => api.get<PortalOrganization[]>("/organizations");
export const createOrganization = (body: { name: string; type: string }) => api.post<PortalOrganization>("/organizations", body);
export const listOrganizationMembers=(id:string)=>api.get<OrganizationMember[]>(`/organizations/${id}/members`);
export const addOrganizationMember=(id:string,body:{userId:string;roleCodes:RoleCode[]})=>api.post<OrganizationMember>(`/organizations/${id}/members`,body);
export const updateOrganizationMember=(id:string,userId:string,body:{status?:"ACTIVE"|"INACTIVE";roleCodes?:RoleCode[]})=>api.patch<OrganizationMember>(`/organizations/${id}/members/${userId}`,body);
export const removeOrganizationMember=(id:string,userId:string)=>api.delete(`/organizations/${id}/members/${userId}`);
export const listRelationships=()=>api.get<UserRelationship[]>("/relationships");
export const acceptRelationship=(id:string)=>api.post<UserRelationship>(`/relationships/${id}/accept`,{});
export const rejectRelationship=(id:string)=>api.post<UserRelationship>(`/relationships/${id}/reject`,{});
