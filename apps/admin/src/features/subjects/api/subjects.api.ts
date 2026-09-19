import { api } from "../../../shared/api/api";
import type { StudentSubject, Subject } from "../model/subject.types";

export const getSubjects = (includeArchived = false) => {
  if (includeArchived) return api.get<Subject[]>("/subjects?includeArchived=true");
  return api.get<Subject[]>("/subjects");
};
export const getStudentSubjects = (studentId: string) =>
  api.get<StudentSubject[]>(`/students/${studentId}/subjects`);
export const createSubject = (draft: { name: string; code: string }) =>
  api.post("/subjects", draft);
export const updateSubject = (id: string, draft: { name: string }) =>
  api.patch(`/subjects/${id}`, draft);
export const setSubjectActive = (id: string, active: boolean) =>
  api.patch(`/subjects/${id}/archive`, { active });
export const updateStudentSubject = (studentId: string, setting: StudentSubject) =>
  api.patch(`/students/${studentId}/subjects/${setting.subject.id}`, {
    enabled: setting.enabled,
    displayName: setting.displayName,
    weeklyTargetMinutes: setting.weeklyTargetMinutes,
  });
export type TeacherAssignment = {
  id: string;
  teacher: { id: string; username: string; firstName?: string; lastName?: string };
  createdAt: string;
};
export const getSubjectTeachers = (subjectId: string, organizationId: string) =>
  api.get<TeacherAssignment[]>(
    `/subjects/${subjectId}/teachers?organizationId=${encodeURIComponent(organizationId)}`,
  );
export const assignSubjectTeacher = (
  subjectId: string,
  teacherId: string,
  organizationId: string,
) => api.post<TeacherAssignment>(`/subjects/${subjectId}/teachers`, { teacherId, organizationId });
export const unassignSubjectTeacher = (
  subjectId: string,
  teacherId: string,
  organizationId: string,
) =>
  api.delete(
    `/subjects/${subjectId}/teachers/${teacherId}?organizationId=${encodeURIComponent(organizationId)}`,
  );
