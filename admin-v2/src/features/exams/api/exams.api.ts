import { api } from "../../../shared/api/api";
import type { Exam } from "../../../shared/types/domain";
import type {
  AttemptDetail,
  AttemptSummary,
  ExamDraft,
} from "../model/exam-model";
import type {
  RetryRequest,
  SyllabusDraft,
} from "../model/exam.types";

export function getExams(
  studentId: string,
) {
  return api.get<Exam[]>(
    `/exams?studentId=${encodeURIComponent(studentId)}`,
  );
}

export function getRetryRequests(
  studentId: string,
) {
  return api.get<RetryRequest[]>(
    `/admin/exam-attempt-requests?studentId=${encodeURIComponent(studentId)}`,
  );
}

export function createExam(
  studentId: string,
  body: ExamDraft,
) {
  return api.post(
    "/exams",
    {
      ...body,
      studentId,
    },
  );
}

export function updateExam(
  examId: string,
  body: Partial<ExamDraft>,
) {
  return api.patch(
    `/exams/${examId}`,
    body,
  );
}

export function deleteExam(
  examId: string,
) {
  return api.delete(
    `/exams/${examId}`,
  );
}

export function reviewRetryRequest(
  requestId: string,
  status: "approved" | "rejected",
  advisorNote: string,
) {
  return api.patch(
    `/admin/exam-attempt-requests/${requestId}`,
    {
      status,
      advisorNote,
    },
  );
}

export function addExamSyllabus(
  examId: string,
  data: SyllabusDraft,
) {
  return api.post(
    `/admin/exams/${examId}/syllabus`,
    data,
  );
}

export function deleteExamSyllabus(
  syllabusId: string,
) {
  return api.delete(
    `/admin/syllabus/${syllabusId}`,
  );
}

export function setExamPublished(
  examId: string,
  published: boolean,
) {
  return api.patch(
    `/admin/exams/${examId}`,
    {
      published,
    },
  );
}

export function getExamAttemptHistory(
  studentId: string,
) {
  return api.get<AttemptSummary[]>(
    `/admin/students/${studentId}/attempts`,
  );
}

export function getExamAttemptDetail(
  studentId: string,
  attemptId: string,
) {
  return api.get<AttemptDetail>(
    `/admin/students/${studentId}/attempts/${attemptId}`,
  );
}
