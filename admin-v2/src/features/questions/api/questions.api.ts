import { api } from "../../../shared/api/api";
import type { Exam } from "../../../shared/types/domain";
import type { QuestionDraft, QuestionView } from "../model/question-model";
export const getStudentExams=(studentId:string)=>api.get<Exam[]>(`/admin/exams?studentId=${encodeURIComponent(studentId)}`);
export const getExamQuestions=(examId:string)=>api.get<QuestionView[]>(`/admin/exams/${examId}/questions`);
export const createExamQuestion=(examId:string,body:QuestionDraft)=>api.post(`/admin/exams/${examId}/questions`,body);
export const updateQuestion=(id:string,body:QuestionDraft)=>api.patch(`/admin/questions/${id}`,body);
export const deleteExamQuestion=(examId:string,id:string)=>api.delete(`/admin/exams/${examId}/questions/${id}`);
