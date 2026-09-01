import { useMemo } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getExams,
  getRetryRequests,
} from "../api/exams.api";
import { matchesExam } from "../model/exam-model";
import type {
  ExamFilterStatus,
  ExamVisibilityFilter,
} from "../model/exam.types";

export function useExamsData({
  studentId,
  search,
  status,
  visibility,
}: {
  studentId: string;
  search: string;
  status: ExamFilterStatus;
  visibility: ExamVisibilityFilter;
}) {
  const queryClient =
    useQueryClient();

  const exams = useQuery({
    queryKey: [
      "exams",
      studentId,
    ],
    enabled: !!studentId,
    queryFn: () =>
      getExams(studentId),
  });

  const retries = useQuery({
    queryKey: [
      "exam-retry",
      studentId,
    ],
    enabled: !!studentId,
    queryFn: () =>
      getRetryRequests(studentId),
  });

  const filtered = useMemo(
    () =>
      (exams.data ?? []).filter(
        (exam) =>
          matchesExam(
            exam,
            search,
            status,
            visibility,
          ),
      ),
    [
      exams.data,
      search,
      status,
      visibility,
    ],
  );

  const pendingRetries =
    useMemo(
      () =>
        (
          retries.data ?? []
        ).filter(
          (request) =>
            !request.status ||
            request.status ===
              "pending",
        ),
      [retries.data],
    );

  function refreshExams() {
    return queryClient.invalidateQueries(
      {
        queryKey: ["exams"],
      },
    );
  }

  return {
    exams,
    retries,
    filtered,
    pendingRetries,
    refreshExams,
  };
}
