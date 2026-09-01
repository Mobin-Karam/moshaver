import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/api";
import type { Student } from "../types/domain";

export function useStudents() {
  const [studentId, setStudentIdState] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("admin-selected-student-id") || "",
  );
  const query = useQuery({
    queryKey: ["students"],
    queryFn: () =>
      api.get<Student[] | { items: Student[] }>("/admin/students?limit=100"),
  });
  const students = Array.isArray(query.data)
    ? query.data
    : (query.data?.items ?? []);
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
    }
  }, []);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === "admin-selected-student-id")
        setStudentIdState(event.newValue || "");
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
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
