import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StudentPicker } from "../../components/StudentPicker";
import { Badge, Button, Card, EmptyState, Field, Input, Textarea } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import { addDays, fa, todayIso } from "../../lib/utils";
import type { Plan } from "../../types/domain";

export function PlannerPage() {
  const students = useStudents();
  const [date, setDate] = useState(todayIso());
  const [json, setJson] = useState("");
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans", students.studentId, date], enabled: !!students.studentId, queryFn: () => api.get<Plan[]>(`/admin/plans?studentId=${students.studentId}&from=${date}&to=${addDays(date, 6)}`) });
  const preview = useMutation({ mutationFn: () => api.post<Record<string, any>>("/admin/import/preview", { studentId: students.studentId, data: JSON.parse(json) }) });
  const commit = useMutation({ mutationFn: (publishImported: boolean) => api.post<Record<string, unknown>>("/admin/import/commit", { studentId: students.studentId, data: JSON.parse(json), replaceExistingPlans: false, replaceExistingExams: false, publishImported, sourceName: `Admin v2 JSON ${new Date().toISOString()}` }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });
  const publishRange = useMutation({ mutationFn: () => api.post<{ updated: number }>("/admin/plans/publish-range", { studentId: students.studentId, from: date, to: addDays(date, 6), published: true }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });
  return <div className="grid gap-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black">برنامه‌ریز</h2><p className="text-slate-500">روزانه، هفتگی، ماهانه، JSON preview و انتشار کنترل‌شده</p></div><div className="grid gap-2 md:grid-cols-2"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div></div><div className="grid gap-4 lg:grid-cols-[1fr_.9fr]"><Card><div className="mb-3 flex justify-between"><h3 className="font-bold">نمای هفته</h3><Button variant="soft" onClick={() => publishRange.mutate()}>انتشار بازه</Button></div>{plans.data?.length ? <div className="grid gap-3">{plans.data.map((p) => <article key={p.id} className="rounded-md border p-3"><div className="flex items-center justify-between"><strong>{p.persianDate || p.planDate}</strong><Badge tone={p.published ? "green" : "amber"}>{p.published ? "منتشر" : "پیش‌نویس"}</Badge></div><p className="text-sm text-slate-500">{p.title || "برنامه روزانه"} - {fa(p.tasks?.length || 0)} فعالیت</p></article>)}</div> : <EmptyState title="برای این بازه برنامه‌ای ثبت نشده است." />}</Card><Card><h3 className="mb-3 font-bold">وارد کردن JSON</h3><div className="grid gap-3"><Field label="JSON"><Textarea rows={10} value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"schemaVersion":2,"plans":[],"exams":[]}' /></Field><div className="flex flex-wrap gap-2"><Button variant="soft" onClick={() => preview.mutate()} disabled={!json}>اعتبارسنجی و پیش‌نمایش</Button><Button onClick={() => commit.mutate(false)} disabled={!preview.data || Boolean(preview.data.errors?.length)}>ثبت پیش‌نویس</Button><Button onClick={() => commit.mutate(true)} disabled={!preview.data || Boolean(preview.data.errors?.length)}>ثبت و انتشار</Button></div>{preview.data ? <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-left text-xs text-slate-100" dir="ltr">{JSON.stringify(preview.data, null, 2)}</pre> : null}</div></Card></div></div>;
}
