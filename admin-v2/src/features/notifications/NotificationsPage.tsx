import { useQuery } from "@tanstack/react-query";
import { Card, EmptyState } from "../../components/ui";
import { StudentPicker } from "../../components/StudentPicker";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";

export function NotificationsPage() {
  const students = useStudents();
  const inbox = useQuery({ queryKey: ["inbox", students.studentId], enabled: !!students.studentId, queryFn: () => api.get<Record<string, unknown[]>>(`/admin/advisor-inbox?studentId=${students.studentId}`) });
  const rows = [
    ...(inbox.data?.missedTasks ?? []).map((x) => ({ type: "فعالیت انجام‌نشده", x })),
    ...(inbox.data?.reviews ?? []).map((x) => ({ type: "مرور", x })),
    ...(inbox.data?.recoveryRequests ?? []).map((x) => ({ type: "درخواست ریکاوری", x })),
    ...(inbox.data?.examRetryRequests ?? []).map((x) => ({ type: "درخواست تلاش مجدد", x })),
    ...(inbox.data?.issues ?? []).map((x) => ({ type: "هشدار دانش‌آموز", x })),
  ];
  return <div className="grid gap-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black">مرکز اعلان‌ها</h2><p className="text-slate-500">برنامه، آزمون، هشدار، پیام و ریکاوری</p></div><div className="w-full md:w-72"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /></div></div><Card>{rows.length ? <div className="grid gap-2">{rows.map((row, i) => <div key={i} className="rounded-md border p-3"><strong>{row.type}</strong><pre className="mt-2 overflow-auto text-left text-xs text-slate-500" dir="ltr">{JSON.stringify(row.x, null, 2)}</pre></div>)}</div> : <EmptyState title="اعلان فعالی وجود ندارد." />}</Card></div>;
}
