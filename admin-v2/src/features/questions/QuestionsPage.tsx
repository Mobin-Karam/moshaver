import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListChecks, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, EmptyState, Field, Input, Select, Textarea } from "../../components/ui";
import { api } from "../../services/api";
import type { Exam } from "../../types/domain";
import { useModal } from "../../components/modal";

export function QuestionsPage() {
  const [examId, setExamId] = useState("");
  const [form, setForm] = useState({ question: "", options: ["", "", "", ""], correctOption: "a", explanation: "" });
  const qc = useQueryClient();
  const modal = useModal();
  const exams = useQuery({ queryKey: ["exams-all"], queryFn: () => api.get<Exam[]>("/admin/exams") });
  const questions = useQuery({ queryKey: ["exam-questions", examId], enabled: !!examId, queryFn: () => api.get<unknown[]>(`/admin/exams/${examId}/questions`) });
  const add = useMutation({ mutationFn: () => api.post(`/admin/exams/${examId}/questions`, form), onSuccess: () => { setForm({ question: "", options: ["", "", "", ""], correctOption: "a", explanation: "" }); qc.invalidateQueries({ queryKey: ["exam-questions", examId] }); } });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/exams/${examId}/questions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-questions", examId] }) });
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black">بانک سؤال</h2>
        <p className="text-slate-500">افزودن سؤال چهارگزینه‌ای و مشاهده آزمون مثل نسخه قدیمی</p>
      </div>
      <Card>
        <Field label="آزمون"><Select value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">انتخاب آزمون</option>{(exams.data ?? []).map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</Select></Field>
      </Card>
      <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <h3 className="mb-3 font-bold">سؤال جدید</h3>
          <div className="grid gap-3">
            <Field label="صورت سؤال"><Textarea className="min-h-28" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
            {form.options.map((option, i) => <Field key={i} label={`گزینه ${i + 1}`}><Input value={option} onChange={(e) => setForm({ ...form, options: form.options.map((x, index) => index === i ? e.target.value : x) })} /></Field>)}
            <Field label="پاسخ صحیح"><Select value={form.correctOption} onChange={(e) => setForm({ ...form, correctOption: e.target.value })}><option value="a">گزینه ۱</option><option value="b">گزینه ۲</option><option value="c">گزینه ۳</option><option value="d">گزینه ۴</option></Select></Field>
            <Field label="توضیح"><Textarea className="min-h-20" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></Field>
            <Button disabled={!examId || add.isPending} onClick={() => add.mutate()}>{add.isPending ? "در حال افزودن" : "افزودن سؤال"}</Button>
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <ListChecks size={18} />
            <h3 className="font-bold">سؤال‌های آزمون</h3>
            <span className="mr-auto text-xs text-slate-500">{questions.data?.length || 0} سؤال</span>
          </div>
          {questions.data?.length ? (
            <div className="grid gap-3">
              {(questions.data as QuestionView[]).map((question, index) => (
                <article key={question.id || index} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between"><strong>سؤال {index + 1}</strong>{question.id ? <Button className="h-8 px-2" variant="danger" onClick={() => void modal.confirm({ title: "حذف سؤال؟", description: "این سؤال از آزمون حذف می‌شود.", tone: "danger", confirmLabel: "حذف" }).then((confirmed) => confirmed && remove.mutate(question.id!))}><Trash2 size={14} /></Button> : null}</div>
                  <p className="mt-2 text-sm leading-7">{question.question || question.text}</p>
                  <div className="mt-3 grid gap-2">
                    {(question.options || []).map((option, optionIndex) => {
                      const key = ["a", "b", "c", "d"][optionIndex];
                      const active = (question.correctOption || question.correctAnswer) === key;
                      return <div key={key} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-emerald-50 text-emerald-800" : "bg-slate-50"}`}>{active ? <CheckCircle2 size={15} /> : <span className="size-[15px]" />}{option}</div>;
                    })}
                  </div>
                  {question.explanation ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{question.explanation}</p> : null}
                </article>
              ))}
            </div>
          ) : <EmptyState title={examId ? "سؤالی برای نمایش نیست." : "ابتدا یک آزمون انتخاب کنید."} />}
        </Card>
      </section>
    </div>
  );
}

type QuestionView = { id?: string; text?: string; question?: string; options?: string[]; correctAnswer?: string; correctOption?: string; explanation?: string };
