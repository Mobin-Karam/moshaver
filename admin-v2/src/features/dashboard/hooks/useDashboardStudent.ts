import { useStudentSelection } from "../../../shared/hooks/useStudentSelection";

export function useDashboardStudent() {
  const students = useStudentSelection();

  return {
    students: students.students,
    studentId: students.studentId,
    selectStudent: students.selectStudent,
  };
}
