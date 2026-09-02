import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/api";
import type { Student } from "../types/domain";

export const STUDENT_SELECTION_EVENT = "admin-selected-student-change";

type StudentsPage = {
  items: Student[];
  total?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
};

const STUDENTS_PAGE_SIZE = 100;

async function loadAllStudents() {
  const students: Student[] = [];
  let offset = 0;

  while (true) {
    const page = await api.get<Student[] | StudentsPage>(
      `/admin/students?limit=${STUDENTS_PAGE_SIZE}&offset=${offset}`,
    );
    if (Array.isArray(page)) return page;

    students.push(...page.items);
    const nextOffset = offset + page.items.length;
    const hasMore = page.hasMore ?? nextOffset < (page.total ?? nextOffset);
    if (!hasMore || page.items.length === 0) return students;
    offset = nextOffset;
  }
}

export function useStudents() {
  const [studentId, setStudentIdState] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("admin-selected-student-id") || "",
  );
  const query = useQuery({
    queryKey: ["students"],
    queryFn: loadAllStudents,
  });
  const students = query.data ?? [];
  const selectedStudentId =
    (studentId && students.some((student) => student.id === studentId)
      ? studentId
      : students[0]?.id) || "";
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );
  const setStudentId = useCallback((next: string) => {
    setStudentIdState(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem("admin-selected-student-id", next);
      else window.localStorage.removeItem("admin-selected-student-id");
      window.dispatchEvent(
        new CustomEvent(STUDENT_SELECTION_EVENT, { detail: next }),
      );
    }
  }, []);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === "admin-selected-student-id")
        setStudentIdState(event.newValue || "");
    }
    window.addEventListener("storage", sync);
    const syncSameWindow = (event: Event) =>
      setStudentIdState((event as CustomEvent<string>).detail || "");
    window.addEventListener(STUDENT_SELECTION_EVENT, syncSameWindow);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(STUDENT_SELECTION_EVENT, syncSameWindow);
    };
  }, []);
  useEffect(() => {
    if (studentId && students.length && studentId !== selectedStudentId)
      setStudentId(selectedStudentId);
  }, [selectedStudentId, setStudentId, studentId, students.length]);
  return {
    ...query,
    students,
    studentId: selectedStudentId,
    selectedStudent,
    setStudentId,
  };
}
