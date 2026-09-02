import {
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useStudentSelection } from "../../../shared/hooks/useStudentSelection";
import { parseLearningFilter } from "../lib/learning-filters";
import type { LearningFilter } from "../model/learning.types";

export function useLearningPageState() {
  const params = useParams();
  const navigate = useNavigate();
  const students = useStudentSelection({ preferredStudentId: params.studentId });
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const studentId = students.studentId;

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
    if (nextStudentId !== studentId) students.selectStudent(nextStudentId);
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

    if (params.studentId && nextStudentId !== params.studentId) {
      void navigate(
        { pathname: `/admin/students/${encodeURIComponent(nextStudentId)}/learning`, search: next.toString() },
        { replace: true },
      );
    } else {
      setSearchParams(next, { replace: true });
    }
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
