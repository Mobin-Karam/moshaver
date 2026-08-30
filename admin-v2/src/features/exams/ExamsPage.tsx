import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, FileQuestion, Plus, Trash2, X } from "lucide-react";
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
  const retryRequests = useQuery({ queryKey: ["exam-retry", students.studentId], enabled: !!students.studentId, queryFn: () => api.get<RetryRequest[]>(`/admin/exam-attempt-requests?studentId=${students.studentId}&status=pending`) });
  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { durationMinutes: 120 } });
  const create = useMutation({ mutationFn: (body: Form) => api.post("/admin/exams", { ...body, studentId: students.studentId, openAt: `${body.isoDate}T08:00:00+03:30`, closeAt: `${body.isoDate}T13:00:00+03:30`, published: true }), onSuccess: () => { reset(); qc.invalidateQueries({ queryKey: ["exams"] }); } });
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.patch(`/admin/exams/${id}`, body), onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/exams/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }) });
  const review = useMutation({ mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) => api.patch(`/admin/exam-attempt-requests/${id}`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-retry"] }) });
  const addSyllabus = useMutation({ mutationFn: ({ examId, subject, description }: { examId: string; subject: string; description: string }) => api.post(`/admin/exams/${examId}/syllabus`, { subject, description, required: true }), onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }) });
  const deleteSyllabus = useMutation({ mutationFn: (id: string) => api.delete(`/admin/syllabus/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }) });
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">آزمون‌ها</h2>
          <p className="text-slate-500">ساخت، زمان‌بندی، انتشار و مدیریت سؤال‌ها</p>
        </div>
        <div className="w-full md:w-72"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /></div>
      </div>
      {retryRequests.data?.length ? <Card><h3 className="mb-3 font-bold">درخواست‌های تلاش مجدد</h3><div className="grid gap-2">{retryRequests.data.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><strong>{request.examTitle || "آزمون"}</strong><p className="text-xs text-slate-500">{request.reason || "بدون توضیح"}</p></div><div className="flex gap-2"><Button onClick={() => review.mutate({ id: request.id, status: "approved" })}><Check size={15} />تأیید</Button><Button variant="danger" onClick={() => review.mutate({ id: request.id, status: "rejected" })}><X size={15} />رد</Button></div></div>)}</div></Card> : null}
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
                  <div className="mt-3 flex gap-2"><Button className="h-8 flex-1 px-2 text-xs" variant="soft" onClick={() => update.mutate({ id: exam.id, body: { published: !exam.published } })}>{exam.published ? "پیش‌نویس کردن" : "انتشار"}</Button><Button className="h-8 px-2" variant="danger" onClick={() => window.confirm("آزمون حذف شود؟") && remove.mutate(exam.id)}><Trash2 size={14} /></Button></div>
                  <div className="mt-3 border-t pt-3"><div className="mb-2 flex items-center justify-between"><strong className="text-xs">بودجه‌بندی</strong><button className="text-xs text-brand" onClick={() => { const subject = window.prompt("نام درس"); const description = subject ? window.prompt("توضیح بودجه") : null; if (subject && description) addSyllabus.mutate({ examId: exam.id, subject, description }); }}>+ افزودن</button></div>{exam.syllabus?.map((item) => <div key={item.id} className="mb-1 flex justify-between rounded bg-white p-2 text-xs"><span>{item.subject}: {item.description}</span><button className="text-rose-700" onClick={() => deleteSyllabus.mutate(item.id)}>حذف</button></div>)}</div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="آزمونی ثبت نشده است." action={<span className="flex items-center gap-2 text-xs"><FileQuestion size={16} />بعد از ساخت، در بانک سؤال قابل انتخاب است.</span>} />}
        </Card>
      </section>
    </div>
  );
}

type RetryRequest = { id: string; examTitle?: string; reason?: string };

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-white p-2"><span className="block text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}
