import { api } from "../../../shared/api/api";
import type { Student } from "../../../shared/types/domain";

export type LearningResource = {
  id: string;
  title: string;
  description: string;
  type: "LINK" | "VIDEO";
  url: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  assignments: Array<{ id: string; student: Pick<Student, "id" | "name" | "grade" | "major"> }>;
  updatedAt: string;
};
export type ResourceInput = Omit<LearningResource, "id" | "assignments" | "updatedAt"> & { studentIds: string[] };

export const listResources = () => api.get<LearningResource[]>("/learning-resources");
export const listResourceStudents = () => api.get<Student[]>("/students");
export const createResource = (body: ResourceInput) => api.post<LearningResource>("/learning-resources", body);
export const updateResource = (id: string, body: ResourceInput) => api.patch<LearningResource>(`/learning-resources/${encodeURIComponent(id)}`, body);
export const deleteResource = (id: string) => api.delete(`/learning-resources/${encodeURIComponent(id)}`);
