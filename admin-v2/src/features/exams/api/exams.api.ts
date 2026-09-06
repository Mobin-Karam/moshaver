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
    `/exam-attempt-requests?studentId=${encodeURIComponent(studentId)}`,
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
    `/exam-attempt-requests/${requestId}`,
    {
      status,
      note: advisorNote,
    },
  );
}

export function addExamSyllabus(
  examId: string,
  data: SyllabusDraft,
) {
  return api.post(
    `/exams/${examId}/syllabus`,
    data,
  );
}

export function deleteExamSyllabus(
  syllabusId: string,
) {
  return api.delete(
    `/syllabus/${syllabusId}`,
  );
}

export function setExamPublished(
  examId: string,
  published: boolean,
) {
  return api.patch(
    `/exams/${examId}`,
    {
      published,
    },
  );
}

export function getExamAttemptHistory(
  studentId: string,
) {
  return api.get<AttemptSummary[]>(
    `/students/${studentId}/exam-attempts`,
  );
}

export function getExamAttemptDetail(
  studentId: string,
  attemptId: string,
) {
  return api.get<AttemptDetail>(
    `/students/${studentId}/exam-attempts/${attemptId}`,
  );
}
