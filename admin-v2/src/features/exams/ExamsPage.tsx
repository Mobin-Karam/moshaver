import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { StudentPicker } from "../../components/StudentPicker";
import { Badge, Button, Card, EmptyState, Field, Input, Textarea } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import type { Exam } from "../../types/domain";

const schema = z.object({ title: z.string().min(1), persianDate: z.string().min(1), isoDate: z.string().min(10), durationMinutes: z.coerce.number().min(1), instructions: z.string().optional() });
type Form = z.infer<typeof schema>;

export function ExamsPage() {
  const students = useStudents();
  const qc = useQueryClient();
  const exams = useQuery({ queryKey: ["exams", students.studentId], enabled: !!students.studentId, queryFn: () => api.get<Exam[]>(`/admin/exams?studentId=${students.studentId}`) });
  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { durationMinutes: 120 } });
  const create = useMutation({ mutationFn: (body: Form) => api.post("/admin/exams", { ...body, studentId: students.studentId, openAt: `${body.isoDate}T08:00:00+03:30`, closeAt: `${body.isoDate}T13:00:00+03:30`, published: true }), onSuccess: () => { reset(); qc.invalidateQueries({ queryKey: ["exams"] }); } });
  return <div className="grid gap-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black">آزمون‌ها</h2><p className="text-slate-500">ساخت، زمان‌بندی، انتشار و سوال‌ها</p></div><div className="w-full md:w-72"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /></div></div><section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><Card><h3 className="mb-3 font-bold">آزمون جدید</h3><form className="grid gap-3" onSubmit={handleSubmit((data) => create.mutate(data))}><Field label="عنوان"><Input {...register("title")} /></Field><Field label="تاریخ فارسی"><Input {...register("persianDate")} /></Field><Field label="تاریخ ISO"><Input type="date" {...register("isoDate")} /></Field><Field label="زمان دقیقه"><Input type="number" {...register("durationMinutes")} /></Field><Field label="دستورالعمل"><Textarea {...register("instructions")} /></Field><Button disabled={formState.isSubmitting}>ساخت آزمون</Button></form></Card><Card><h3 className="mb-3 font-bold">فهرست آزمون‌ها</h3>{exams.data?.length ? <div className="grid gap-3">{exams.data.map((exam) => <article key={exam.id} className="rounded-md border p-3"><div className="flex justify-between"><strong>{exam.title}</strong><Badge tone={exam.published ? "green" : "amber"}>{exam.published ? "منتشر" : "پیش‌نویس"}</Badge></div><p className="text-sm text-slate-500">{exam.persianDate || exam.isoDate} - {exam.durationMinutes || 120} دقیقه - {exam.delivery?.questionCount || 0} سؤال</p></article>)}</div> : <EmptyState title="آزمونی ثبت نشده است." />}</Card></section></div>;
}
