import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FileQuestion, Plus } from "lucide-react";
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
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">آزمون‌ها</h2>
          <p className="text-slate-500">ساخت، زمان‌بندی، انتشار و مدیریت سؤال‌ها</p>
        </div>
        <div className="w-full md:w-72"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /></div>
      </div>
      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Plus size={18} />
            <h3 className="font-bold">آزمون جدید</h3>
          </div>
          <form className="grid gap-3" onSubmit={handleSubmit((data) => create.mutate(data))}>
            <Field label="عنوان"><Input {...register("title")} placeholder="مثلاً جامع ریاضی" /></Field>
            <Field label="تاریخ فارسی"><Input {...register("persianDate")} placeholder="۳۰ مرداد ۱۴۰۵" /></Field>
            <Field label="تاریخ"><Input type="date" {...register("isoDate")} /></Field>
            <Field label="زمان دقیقه"><Input type="number" {...register("durationMinutes")} /></Field>
            <Field label="دستورالعمل"><Textarea className="min-h-24" {...register("instructions")} placeholder="قوانین آزمون، منابع، توضیح برای دانش‌آموز" /></Field>
            <Button disabled={formState.isSubmitting || create.isPending}>{create.isPending ? "در حال ساخت" : "ساخت آزمون"}</Button>
          </form>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">فهرست آزمون‌ها</h3>
            <Badge tone="blue">{exams.data?.length || 0} آزمون</Badge>
          </div>
          {exams.data?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {exams.data.map((exam) => (
                <article key={exam.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="block truncate">{exam.title}</strong>
                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><CalendarClock size={14} />{exam.persianDate || exam.isoDate}</span>
                    </div>
                    <Badge tone={exam.published ? "green" : "amber"}>{exam.published ? "منتشر" : "پیش‌نویس"}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <Metric label="دقیقه" value={exam.durationMinutes || 120} />
                    <Metric label="سؤال" value={exam.delivery?.questionCount || 0} />
                    <Metric label="تلاش" value={exam.maxAttempts || 1} />
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="آزمونی ثبت نشده است." action={<span className="flex items-center gap-2 text-xs"><FileQuestion size={16} />بعد از ساخت، در بانک سؤال قابل انتخاب است.</span>} />}
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-white p-2"><span className="block text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}
