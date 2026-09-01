import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import { DatePicker } from "../../../shared/ui/date-picker";
import { useLocale } from "../../../shared/ui/locale";
import { Card, EmptyState } from "../../../shared/ui/ui";
import { useStudentSelection } from "../../../shared/hooks/useStudentSelection";
import { addDays, todayIso } from "../../../shared/lib/utils";
import { getReports } from "../api/reports.api";
import { ReportCard } from "../components/ReportCard";
export function ReportsPage() {
  const students = useStudentSelection();
  const locale = useLocale();
  const [from, setFrom] = useState(addDays(todayIso(), -7));
  const [to, setTo] = useState(todayIso());
  const reports = useQuery({ queryKey: ["reports", students.studentId, from, to], enabled: !!students.studentId, queryFn: () => getReports(students.studentId, from, to) });
  return <div className="grid gap-5">
    <div className="flex justify-end"><div className="grid gap-2 md:grid-cols-3"><StudentPicker students={students.students} value={students.studentId} onChange={students.selectStudent} /><DatePicker value={from} max={to} onChange={setFrom} /><DatePicker value={to} min={from} onChange={setTo} /></div></div>
    <Card>{reports.data?.length ? <div className="grid gap-3">{reports.data.map((r, i) => <ReportCard key={String(r.id ?? i)} report={r} formatDate={locale.formatDate} />)}</div> : <EmptyState title={`برای بازه انتخابی گزارشی نیست. ${locale.formatDate(from)} تا ${locale.formatDate(to)}`} />}</Card>
  </div>;
}
