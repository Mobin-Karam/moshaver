import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getExamAttemptDetail,
  getExamAttemptHistory,
} from "../api/exams.api";
import { AttemptHistoryList } from "./AttemptHistoryList";
import { AttemptReview } from "./AttemptReview";

export function ExamAttempts({
  studentId,
}: {
  studentId: string;
}) {
  const [attemptId, setAttemptId] =
    useState("");

  const history = useQuery({
    queryKey: [
      "exam-attempt-history",
      studentId,
    ],
    queryFn: () =>
      getExamAttemptHistory(
        studentId,
      ),
  });

  const detail = useQuery({
    queryKey: [
      "exam-attempt-detail",
      studentId,
      attemptId,
    ],
    enabled: !!attemptId,
    queryFn: () =>
      getExamAttemptDetail(
        studentId,
        attemptId,
      ),
  });

  if (attemptId) {
    return (
      <AttemptReview
        detail={detail.data}
        loading={detail.isLoading}
        error={detail.isError}
        back={() =>
          setAttemptId("")
        }
      />
    );
  }

  return (
    <AttemptHistoryList
      history={history}
      onSelect={setAttemptId}
    />
  );
}
