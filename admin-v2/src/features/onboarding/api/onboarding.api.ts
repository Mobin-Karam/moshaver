import { api } from "../../../shared/api/api";
import type { PortalOrganization, PortalUser } from "../../access/api/access.api";
export type PendingStudent = { id: string; name: string; username: string; grade: string; major: string; createdAt: string };
export type StudentAssignment = { studentId: string; organization: PortalOrganization; advisor: Pick<PortalUser, "id" | "username" | "firstName" | "lastName">; onboardingStatus: "ASSIGNED" };
export type AssignmentInput = { mode: "AUTO" } | { mode: "MANUAL"; organizationId: string; advisorUserId: string };
export const listPendingStudents = () => api.get<PendingStudent[]>("/onboarding/students/pending");
export const listOnboardingOrganizations = () => api.get<PortalOrganization[]>("/organizations");
export const listAdvisors = () => api.get<PortalUser[]>("/users?role=ADVISOR&status=ACTIVE");
export const assignStudent = (id: string, body: AssignmentInput) => api.post<StudentAssignment>(`/onboarding/students/${encodeURIComponent(id)}/assign`, body);
