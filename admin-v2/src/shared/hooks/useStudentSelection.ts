import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useStudents } from "./useStudents";

export function useStudentSelection(options: { clearOnChange?: string[]; preferredStudentId?: string } = {}) {
  const students = useStudents();
  const [params, setParams] = useSearchParams();
  const pendingStudentId = useRef("");
  const urlStudentId = params.get("studentId") || "";
  const urlStudent = useMemo(
    () => students.students.find((student) => student.id === urlStudentId),
    [students.students, urlStudentId],
  );
  const preferredStudent = students.students.find(
    (student) => student.id === options.preferredStudentId,
  );
  const pendingStudent = students.students.find(
    (student) => student.id === pendingStudentId.current,
  );
  const studentId = pendingStudent?.id || preferredStudent?.id || urlStudent?.id || students.studentId;
  const selectedStudent = useMemo(
    () => students.students.find((student) => student.id === studentId) ?? null,
    [studentId, students.students],
  );
  const clearKey = (options.clearOnChange ?? []).join("\0");

  useEffect(() => {
    if (students.isLoading || !students.students.length || !studentId) return;
    if (urlStudentId === pendingStudentId.current) pendingStudentId.current = "";
    if (students.studentId !== studentId) students.setStudentId(studentId);
    if (urlStudentId === studentId) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("studentId", studentId);
      clearKey.split("\0").filter(Boolean).forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [clearKey, studentId, students.isLoading, students.studentId, students.students.length, students.setStudentId, urlStudentId, setParams]);

  const selectStudent = useCallback((nextStudentId: string) => {
    if (!students.students.some((student) => student.id === nextStudentId)) return;
    pendingStudentId.current = nextStudentId;
    students.setStudentId(nextStudentId);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("studentId", nextStudentId);
      clearKey.split("\0").filter(Boolean).forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [clearKey, setParams, students.setStudentId, students.students]);

  return { ...students, studentId, selectedStudent, selectStudent };
}
