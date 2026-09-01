import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useStudents } from "../../../shared/hooks/useStudents";

export function useDashboardStudent() {
  const students = useStudents();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const urlStudentId =
      params.get("studentId") || "";

    if (
      urlStudentId &&
      urlStudentId !== students.studentId &&
      students.students.some(
        (student) =>
          student.id === urlStudentId,
      )
    ) {
      students.setStudentId(urlStudentId);
    }
  }, [params, students]);

  useEffect(() => {
    if (!students.studentId) return;

    const urlStudentId =
      params.get("studentId");

    if (
      urlStudentId === students.studentId
    ) {
      return;
    }

    setParams(
      (current) => {
        const next =
          new URLSearchParams(current);

        next.set(
          "studentId",
          students.studentId,
        );

        return next;
      },
      { replace: true },
    );
  }, [
    students.studentId,
    params,
    setParams,
  ]);

  function selectStudent(id: string) {
    students.setStudentId(id);

    setParams(
      (current) => {
        const next =
          new URLSearchParams(current);

        next.set("studentId", id);

        return next;
      },
      { replace: true },
    );
  }

  return {
    students: students.students,
    studentId: students.studentId,
    selectStudent,
  };
}
