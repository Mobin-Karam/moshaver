import { useQuery } from "@tanstack/react-query";
import { StudentPicker } from "../../components/StudentPicker";
import { Card, EmptyState, Input } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import { addDays, fa, todayIso } from "../../lib/utils";
import { useState } from "react";

export function ReportsPage() {
  const students = useStudents();
  const [from, setFrom] = useState(addDays(todayIso(), -7));
  const [to, setTo] = useState(todayIso());
  const reports = useQuery({ queryKey: ["reports", students.studentId, from, to], enabled: !!students.studentId, queryFn: () => api.get<Record<string, unknown>[]>(`/admin/reports?studentId=${students.studentId}&from=${from}&to=${to}`) });
  return <div className="grid gap-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black">گزارش‌ها</h2><p className="text-slate-500">ساعت مطالعه، تکمیل، آزمون، دقت و توصیه‌ها</p></div><div className="grid gap-2 md:grid-cols-3"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></div><Card>{reports.data?.length ? <div className="grid gap-3">{reports.data.map((r, i) => <article key={String(r.id ?? i)} className="rounded-md border p-3"><strong>{String(r.plan_date ?? r.planDate ?? "گزارش")}</strong><p className="text-sm text-slate-500">داده خام گزارش برای تحلیل هفتگی</p><pre className="mt-2 max-h-40 overflow-auto text-left text-xs" dir="ltr">{JSON.stringify(r, null, 2)}</pre></article>)}</div> : <EmptyState title={`برای بازه انتخابی گزارشی نیست. ${fa(from)} تا ${fa(to)}`} />}</Card></div>;
}
