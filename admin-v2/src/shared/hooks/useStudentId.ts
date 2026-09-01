import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useStudents } from "./useStudents";

/**
 * Hook that synchronizes student selection with URL query params.
 * Automatically reads from URL on mount and syncs changes back to URL.
 *
 * Usage:
 * ```
 * const studentId = useStudentId();
 * ```
 *
 * The hook handles:
 * - Reading initial studentId from URL params (studentId query param)
 * - Persisting studentId changes to URL
 * - Syncing URL changes back to the hook
 */
export function useStudentId() {
  const students = useStudents();
  const [params, setParams] = useSearchParams();

  // Sync URL param to hook state on mount or when URL changes
  useEffect(() => {
    if (students.isLoading || !students.students.length) return;

    const urlStudentId = params.get("studentId") || "";
    const studentExists = urlStudentId && students.students.some((s) => s.id === urlStudentId);

    if (urlStudentId && studentExists && urlStudentId !== students.studentId) {
      students.setStudentId(urlStudentId);
    }
  }, [params, students.isLoading, students.students, students.studentId, students.setStudentId]);

  // Sync hook state changes to URL
  useEffect(() => {
    if (!students.studentId) return;

    const urlStudentId = params.get("studentId");
    if (urlStudentId === students.studentId) return;

    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (students.studentId) next.set("studentId", students.studentId);
        else next.delete("studentId");
        return next;
      },
      { replace: true },
    );
  }, [students.studentId, params, setParams]);

  return students.studentId;
}
