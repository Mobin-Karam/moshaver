import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../api/api";
import type { Student } from "../types/domain";

export function useStudents() {
  const [studentId, setStudentId] = useState("");
  const query = useQuery({
    queryKey: ["students"],
    queryFn: () =>
      api.get<Student[] | { items: Student[] }>("/admin/students?limit=100"),
  });
  const students = Array.isArray(query.data)
    ? query.data
    : (query.data?.items ?? []);
  const selectedStudentId = studentId || students[0]?.id || "";
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );
  return {
    ...query,
    students,
    studentId: selectedStudentId,
    selectedStudent,
    setStudentId,
  };
}
