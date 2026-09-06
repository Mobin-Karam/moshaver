import { api } from "../../../shared/api/api";
import type { Subject } from "../model/subject.types";

export const getSubjects = () => api.get<Subject[]>("/subjects");
export const getStudentSubjects = (studentId: string) =>
  api.get<Subject[]>(`/students/${studentId}/subjects`);
export const createSubject = (draft: {
  name: string;
  subjectKey: string;
  displayOrder: number;
}) => api.post("/subjects", draft);
export const updateSubject = (subject: Subject) =>
  api.patch(`/subjects/${subject.id}`, {
    name: subject.name,
    displayOrder: Number(subject.display_order ?? subject.displayOrder ?? 0),
  });
export const updateStudentSubject = (studentId: string, subject: Subject) =>
  api.patch(`/students/${studentId}/subjects/${subject.id}`, {
    status: subject.status || "yellow",
    progress: Number(subject.progress || 0),
    mastery: subject.mastery || "",
    note: subject.note || "",
  });
export type TeacherAssignment={id:string;teacher:{id:string;username:string;firstName?:string;lastName?:string};createdAt:string};
export const getSubjectTeachers=(subjectId:string,organizationId:string)=>api.get<TeacherAssignment[]>(`/subjects/${subjectId}/teachers?organizationId=${encodeURIComponent(organizationId)}`);
export const assignSubjectTeacher=(subjectId:string,teacherId:string,organizationId:string)=>api.post<TeacherAssignment>(`/subjects/${subjectId}/teachers`,{teacherId,organizationId});
export const unassignSubjectTeacher=(subjectId:string,teacherId:string,organizationId:string)=>api.delete(`/subjects/${subjectId}/teachers/${teacherId}?organizationId=${encodeURIComponent(organizationId)}`);
