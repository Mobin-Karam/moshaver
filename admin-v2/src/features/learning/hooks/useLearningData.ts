import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStudentLearning } from "../api/learning.api";
import { filterLearningItems } from "../lib/learning-filters";
import type { LearningFilter } from "../model/learning.types";

export function useLearningData({
  studentId,
  search,
  filter,
}: {
  studentId: string;
  search: string;
  filter: LearningFilter;
}) {
  const learning =
    useQuery({
      queryKey: [
        "student-learning",
        studentId,
      ],
      enabled: !!studentId,
      queryFn: () =>
        getStudentLearning(
          studentId,
        ),
    });

  const items = useMemo(
    () =>
      filterLearningItems(
        learning.data?.items ||
          [],
        search,
        filter,
      ),
    [
      search,
      filter,
      learning.data?.items,
    ],
  );

  return {
    learning,
    items,
    summary:
      learning.data?.summary,
  };
}
