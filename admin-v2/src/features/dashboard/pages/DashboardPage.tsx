import { DashboardContent } from "../components/DashboardContent";
import { DashboardStudentPicker } from "../components/DashboardStudentPicker";
import { useDashboardData } from "../hooks/useDashboardData";
import { useDashboardStudent } from "../hooks/useDashboardStudent";

export function DashboardPage() {
  const student =
    useDashboardStudent();

  const dashboard =
    useDashboardData(
      student.studentId,
    );

  return (
    <div className="grid gap-5">
      <DashboardStudentPicker
        students={student.students}
        value={student.studentId}
        onChange={student.selectStudent}
      />

      <DashboardContent
        overviewLoading={
          dashboard.overview.isLoading
        }
        metrics={dashboard.metrics}
        health={
          dashboard.overview.data?.health
        }
        inboxCount={
          dashboard.inboxCount
        }
        attentionItems={
          dashboard.attentionItems
        }
      />
    </div>
  );
}
