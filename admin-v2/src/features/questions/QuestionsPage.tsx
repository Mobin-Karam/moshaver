import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, EmptyState, Field, Input, Select, Textarea } from "../../components/ui";
import { api } from "../../services/api";
import type { Exam } from "../../types/domain";

export function QuestionsPage() {
  const [examId, setExamId] = useState("");
  const [form, setForm] = useState({ question: "", options: ["", "", "", ""], correctOption: "a", explanation: "" });
  const qc = useQueryClient();
  const exams = useQuery({ queryKey: ["exams-all"], queryFn: () => api.get<Exam[]>("/admin/exams") });
  const questions = useQuery({ queryKey: ["exam-questions", examId], enabled: !!examId, queryFn: () => api.get<unknown[]>(`/admin/exams/${examId}/questions`) });
  const add = useMutation({ mutationFn: () => api.post(`/admin/exams/${examId}/questions`, form), onSuccess: () => { setForm({ question: "", options: ["", "", "", ""], correctOption: "a", explanation: "" }); qc.invalidateQueries({ queryKey: ["exam-questions", examId] }); } });
  return <div className="grid gap-5"><div><h2 className="text-2xl font-black">بانک سؤال</h2><p className="text-slate-500">فیلتر بر اساس آزمون، درس، مبحث و سختی؛ واردکردن JSON از برنامه‌ریز انجام می‌شود.</p></div><Card><Field label="آزمون"><Select value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">انتخاب آزمون</option>{(exams.data ?? []).map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</Select></Field></Card><section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><Card><h3 className="mb-3 font-bold">سؤال جدید</h3><div className="grid gap-3"><Field label="صورت سؤال"><Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>{form.options.map((option, i) => <Field key={i} label={`گزینه ${i + 1}`}><Input value={option} onChange={(e) => setForm({ ...form, options: form.options.map((x, index) => index === i ? e.target.value : x) })} /></Field>)}<Field label="پاسخ صحیح"><Select value={form.correctOption} onChange={(e) => setForm({ ...form, correctOption: e.target.value })}><option value="a">گزینه ۱</option><option value="b">گزینه ۲</option><option value="c">گزینه ۳</option><option value="d">گزینه ۴</option></Select></Field><Field label="توضیح"><Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></Field><Button disabled={!examId} onClick={() => add.mutate()}>افزودن سؤال</Button></div></Card><Card><h3 className="mb-3 font-bold">سؤال‌های آزمون</h3>{questions.data?.length ? <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-left text-xs text-white" dir="ltr">{JSON.stringify(questions.data, null, 2)}</pre> : <EmptyState title="سؤالی برای نمایش نیست." />}</Card></section></div>;
}
