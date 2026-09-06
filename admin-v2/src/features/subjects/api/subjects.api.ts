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
