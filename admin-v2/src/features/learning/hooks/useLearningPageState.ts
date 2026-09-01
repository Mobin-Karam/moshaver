import {
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useStudents } from "../../../shared/hooks/useStudents";
import { parseLearningFilter } from "../lib/learning-filters";
import type { LearningFilter } from "../model/learning.types";

export function useLearningPageState() {
  const students = useStudents();
  const params = useParams();
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const studentId =
    params.studentId ||
    searchParams.get(
      "studentId",
    ) ||
    students.studentId;

  const initialFilter =
    parseLearningFilter(
      searchParams.get("status"),
    );

  const [search, setSearch] =
    useState(
      searchParams.get("q") || "",
    );

  const [filter, setFilter] =
    useState<LearningFilter>(
      initialFilter,
    );

  const deferredSearch =
    useDeferredValue(search);

  function updateLocation(
    nextStudentId: string,
    nextFilter = filter,
    nextSearch = search,
  ) {
    const next =
      new URLSearchParams();

    if (nextStudentId) {
      next.set(
        "studentId",
        nextStudentId,
      );
    }

    if (nextFilter !== "all") {
      next.set(
        "status",
        nextFilter,
      );
    }

    if (nextSearch.trim()) {
      next.set(
        "q",
        nextSearch.trim(),
      );
    }

    setSearchParams(
      next,
      {
        replace: true,
      },
    );
  }

  useEffect(() => {
    if (
      !params.studentId &&
      studentId &&
      searchParams.get(
        "studentId",
      ) !== studentId
    ) {
      updateLocation(
        studentId,
      );
    }
  }, [studentId]);

  function changeSearch(
    value: string,
  ) {
    setSearch(value);

    updateLocation(
      studentId,
      filter,
      value,
    );
  }

  function changeFilter(
    value: LearningFilter,
  ) {
    setFilter(value);

    updateLocation(
      studentId,
      value,
    );
  }

  return {
    students,
    studentId,
    search,
    deferredSearch,
    filter,
    updateLocation,
    changeSearch,
    changeFilter,
  };
}
