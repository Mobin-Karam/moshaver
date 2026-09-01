import {
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useStudents } from "../../../shared/hooks/useStudents";
import type {
  ExamFilterStatus,
  ExamVisibilityFilter,
} from "../model/exam.types";

export function useExamFilters() {
  const students = useStudents();
  const [params, setParams] =
    useSearchParams();

  const studentParam =
    params.get("studentId") || "";

  const searchParam =
    params.get("search") || "";

  const statusParam =
    (params.get("status") ||
      "all") as ExamFilterStatus;

  const visibilityParam =
    (params.get("visibility") ||
      "all") as ExamVisibilityFilter;

  const [search, setSearch] =
    useState(searchParam);

  const [status, setStatus] =
    useState<ExamFilterStatus>(
      statusParam,
    );

  const [
    visibility,
    setVisibility,
  ] =
    useState<ExamVisibilityFilter>(
      visibilityParam,
    );

  const [selected, setSelected] =
    useState<string[]>([]);

  const deferredSearch =
    useDeferredValue(search);

  useEffect(() => {
    if (
      studentParam &&
      studentParam !==
        students.studentId
    ) {
      students.setStudentId(
        studentParam,
      );
    }
  }, [
    studentParam,
    students.studentId,
    students.setStudentId,
  ]);

  useEffect(() => {
    setSearch(searchParam);
    setStatus(statusParam);
    setVisibility(
      visibilityParam,
    );
  }, [
    searchParam,
    statusParam,
    visibilityParam,
  ]);

  useEffect(() => {
    if (!students.studentId) {
      return;
    }

    setParams(
      (current) => {
        current.set(
          "studentId",
          students.studentId,
        );

        search
          ? current.set(
              "search",
              search,
            )
          : current.delete(
              "search",
            );

        status !== "all"
          ? current.set(
              "status",
              status,
            )
          : current.delete(
              "status",
            );

        visibility !== "all"
          ? current.set(
              "visibility",
              visibility,
            )
          : current.delete(
              "visibility",
            );

        return current;
      },
      {
        replace: true,
      },
    );
  }, [
    students.studentId,
    search,
    status,
    visibility,
  ]);

  useEffect(() => {
    setSelected([]);
  }, [students.studentId]);

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setVisibility("all");
  }

  return {
    students,
    search,
    setSearch,
    deferredSearch,
    status,
    setStatus,
    visibility,
    setVisibility,
    selected,
    setSelected,
    clearFilters,
  };
}
