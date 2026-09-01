import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ListChecks, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../shared/ui/ui";
import { api } from "../../shared/api/api";
import type { Exam } from "../../shared/types/domain";
import { useModal } from "../../shared/ui/modal";
import { notify } from "../../shared/ui/notifications";
import { emptyQuestion, questionDraft, questionError, questionMatches, questionNumber, questionPayload, type QuestionView } from "./question-model";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import { useStudents } from "../../shared/hooks/useStudents";

export function QuestionsPage() {
  const [params, setParams] = useSearchParams();
  const students = useStudents();
  const studentParam = params.get("studentId") || "";
  const examParam = params.get("examId") || "";
  const searchParam = params.get("search") || "";
  const examId = examParam;
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const search = searchParam;
  const [submitted, setSubmitted] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [form, setForm] = useState(emptyQuestion);
  const qc = useQueryClient();
  const modal = useModal();
  const deferredSearch = useDeferredValue(search);
  useEffect(() => { if (studentParam && studentParam !== students.studentId) students.setStudentId(studentParam); }, [studentParam, students.studentId, students.setStudentId]);
  useEffect(() => { setEditingId(""); setSelected([]); setForm(emptyQuestion()); setSubmitted(false); }, [students.studentId, examId]);
  const exams = useQuery({
    queryKey: ["exams-all", students.studentId],
    enabled: !!students.studentId,
    queryFn: () => api.get<Exam[]>(`/admin/exams?studentId=${encodeURIComponent(students.studentId)}`),
  });
  const questions = useQuery({
    queryKey: ["exam-questions", examId],
    enabled: !!examId,
    queryFn: () => api.get<QuestionView[]>(`/admin/exams/${examId}/questions`),
  });
  const add = useMutation({
    mutationFn: () =>
      editingId
        ? api.patch(`/admin/questions/${editingId}`, questionPayload(form))
        : api.post(`/admin/exams/${examId}/questions`, questionPayload(form)),
    onSuccess: () => {
      setForm({ ...emptyQuestion(), sortOrder: nextSortOrder + (editingId ? 0 : 1) });
      setEditingId("");
      notify(editingId ? "سؤال ویرایش شد." : "سؤال افزوده شد.");
      setSubmitted(false);
      void qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      void qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => notify(error instanceof Error ? error.message : "ذخیره سؤال ناموفق بود.", "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/exams/${examId}/questions/${id}`),
    onSuccess: (_, id) => {
      setSelected((items) => items.filter((item) => item !== id));
      if (editingId === id) { setEditingId(""); setForm(emptyQuestion()); }
      notify("سؤال حذف شد.");
      void qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      void qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => notify(error instanceof Error ? error.message : "حذف سؤال ناموفق بود.", "error"),
  });
  const visibleQuestions = useMemo(() => (questions.data ?? []).filter((item) => questionMatches(item, deferredSearch)), [questions.data, deferredSearch]);
  const validationError = questionError(form);
  const selectedExam = exams.data?.find((exam) => exam.id === examId);
  const nextSortOrder = Math.max(0, ...(questions.data || []).map((item, index) => questionNumber(item, index + 1))) + 1;
  useEffect(() => {
    if (!examId || !exams.isSuccess || selectedExam) return;
    setParams((current) => { const next = new URLSearchParams(current); next.delete("examId"); next.delete("search"); return next; }, { replace: true });
    notify("آزمون انتخاب‌شده متعلق به این دانش‌آموز نیست.", "warning");
  }, [examId, exams.isSuccess, selectedExam, setParams]);
  return (
    <div className="grid gap-5">
      <header className="flex justify-end">
        {examId ? <Link to={`/admin/exams?studentId=${encodeURIComponent(students.studentId)}`}><Button variant="soft">بازگشت به آزمون‌ها</Button></Link> : null}
      </header>
      <Card className="sticky top-16 z-10 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
        <Field label="دانش‌آموز">
          <StudentPicker students={students.students} value={students.studentId} onChange={(studentId) => { students.setStudentId(studentId); setParams((current) => { const next = new URLSearchParams(current); next.set("studentId", studentId); next.delete("examId"); next.delete("search"); return next; }); }} />
        </Field>
        <Field label="آزمون">
          <Select
            value={examId}
            disabled={!students.studentId || exams.isLoading}
            onChange={(e) => {
              const value = e.target.value;
              setParams((current) => { const next = new URLSearchParams(current); value ? next.set("examId", value) : next.delete("examId"); next.set("studentId", students.studentId); next.delete("search"); return next; });
              setSelected([]);
            }}
          >
            <option value="">{exams.isLoading ? "در حال دریافت آزمون‌ها…" : exams.isError ? "دریافت آزمون‌ها ناموفق بود" : "انتخاب آزمون"}</option>
            {(exams.data ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </Select>
        </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold">{selectedExam?.title || "آزمونی انتخاب نشده"}</span>
          {selectedExam ? <><span className="rounded-full bg-slate-100 px-2 py-1">{selectedExam.persianDate || selectedExam.isoDate}</span><span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{questions.data?.length || selectedExam.delivery?.questionCount || 0} سؤال</span><span className={`rounded-full px-2 py-1 ${selectedExam.published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{selectedExam.published ? "منتشر" : "پیش‌نویس"}</span></> : null}
        </div>
        {selectedExam?.published ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">این آزمون منتشر است؛ تغییر سؤال‌ها بلافاصله روی نسخه دانش‌آموز اثر می‌گذارد.</p> : null}
      </Card>
      <section className="grid min-h-0 gap-4 lg:h-[calc(100vh-15.5rem)] lg:grid-cols-[minmax(330px,400px)_minmax(0,1fr)]">
        <Card className="overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">
              {editingId ? "ویرایش سؤال" : "سؤال جدید"}
            </h3>
            {editingId ? (
              <Button
                className="h-8"
                variant="ghost"
                onClick={() => {
                  setEditingId("");
                  setForm({ ...emptyQuestion(), sortOrder: nextSortOrder });
                  setSubmitted(false);
                }}
              >
                انصراف
              </Button>
            ) : null}
          </div>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); if (!validationError && examId) add.mutate(); }} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") event.currentTarget.requestSubmit(); }}>
            <Field label="صورت سؤال">
              <Textarea
                className="min-h-28"
                maxLength={2000}
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
              />
            </Field>
            {form.options.map((option, i) => { const key = ["a", "b", "c", "d"][i]; const correct = form.correctOption === key; return (
              <Field key={key} label={`گزینه ${i + 1}`}>
                <div className={`flex items-center gap-2 rounded-md border p-1 ${correct ? "border-emerald-300 bg-emerald-50" : "border-transparent"}`}>
                  <input aria-label={`انتخاب گزینه ${i + 1} به‌عنوان پاسخ صحیح`} type="radio" name="correctOption" checked={correct} onChange={() => setForm({ ...form, correctOption: key })} />
                  <Input className="border-0 bg-transparent" maxLength={1000} value={option} onChange={(e) => setForm({ ...form, options: form.options.map((x, index) => index === i ? e.target.value : x) })} />
                </div>
              </Field>
            ); })}
            <p className="text-xs text-slate-500">دایره کنار گزینه را برای تعیین پاسخ صحیح انتخاب کنید.</p>
            <Field label="توضیح">
              <Textarea
                className="min-h-20"
                maxLength={2000}
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
              />
            </Field>
            <details className="rounded-md border border-slate-200 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">اطلاعات تکمیلی و مرور <ChevronDown size={16} /></summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <Field label="کتاب">
                <Input
                  maxLength={200}
                  value={form.book}
                  onChange={(e) => setForm({ ...form, book: e.target.value })}
                />
              </Field>
              <Field label="فصل">
                <Input
                  maxLength={200}
                  value={form.chapter}
                  onChange={(e) =>
                    setForm({ ...form, chapter: e.target.value })
                  }
                />
              </Field>
              <Field label="درس">
                <Input
                  maxLength={200}
                  value={form.lesson}
                  onChange={(e) => setForm({ ...form, lesson: e.target.value })}
                />
              </Field>
              <Field label="مبحث">
                <Input
                  maxLength={240}
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </Field>
              <Field label="ترتیب">
                <Input
                  type="number"
                  min={1}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="راهنمای مرور آینده">
              <Textarea
                className="min-h-20"
                maxLength={3000}
                value={form.hint}
                onChange={(e) => setForm({ ...form, hint: e.target.value })}
              />
            </Field>
            </details>
            {submitted && validationError ? <p role="alert" className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{validationError}</p> : null}
            <Button
              loading={add.isPending}
              disabled={!examId || add.isPending}
              type="submit"
            >
              {editingId ? "ذخیره تغییرات" : "افزودن سؤال"}
            </Button>
            <p className="text-center text-[11px] text-slate-400">ذخیره سریع: Ctrl/⌘ + Enter</p>
          </form>
        </Card>
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ListChecks size={18} />
            <h3 className="font-bold">سؤال‌های آزمون</h3>
            <span className="mr-auto text-xs text-slate-500">
              {visibleQuestions.length} از {questions.data?.length || 0} سؤال
            </span>
            {visibleQuestions.length ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={visibleQuestions.every((item) => !!item.id && selected.includes(item.id))} onChange={(event) => { const ids = visibleQuestions.flatMap((item) => item.id ? [item.id] : []); setSelected((current) => event.target.checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id))); }} /> انتخاب نتایج</label> : null}
            {selected.length ? (
              <Button
                className="h-8"
                variant="danger"
                loading={bulkDeleting}
                onClick={() =>
                  void modal
                    .confirm({
                      title: `حذف ${selected.length} سؤال؟`,
                      tone: "danger",
                      confirmLabel: "حذف همه",
                    })
                    .then(async (ok) => {
                      if (!ok) return;
                      setBulkDeleting(true);
                      try {
                        const targetIds = [...selected];
                        const results = await Promise.allSettled(targetIds.map((id) => api.delete(`/admin/exams/${examId}/questions/${id}`)));
                        const failed = targetIds.filter((_, index) => results[index]?.status === "rejected");
                        setSelected(failed);
                        if (editingId && !failed.includes(editingId) && targetIds.includes(editingId)) { setEditingId(""); setForm({ ...emptyQuestion(), sortOrder: nextSortOrder }); }
                        failed.length ? notify(`${failed.length} سؤال حذف نشد؛ احتمالاً در سابقه آزمون استفاده شده است.`, "warning") : notify("سؤال‌های انتخاب‌شده حذف شدند.");
                        void qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
                        void qc.invalidateQueries({ queryKey: ["exams"] });
                      } finally { setBulkDeleting(false); }
                    })
                }
              >
                حذف انتخاب‌شده
              </Button>
            ) : null}
          </div>
          {examId ? <div className="mb-3 flex gap-2"><div className="relative flex-1"><Search className="absolute right-3 top-2.5 text-slate-400" size={16} /><Input className="pr-9" type="search" placeholder="جست‌وجو در متن، مبحث یا گزینه‌ها…" value={search} onChange={(event) => { const value = event.target.value; setParams((current) => { const next = new URLSearchParams(current); value ? next.set("search", value) : next.delete("search"); return next; }, { replace: true }); }} /></div>{search ? <Button className="px-3" variant="ghost" aria-label="پاک‌کردن جست‌وجو" onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.delete("search"); return next; }, { replace: true })}><RotateCcw size={16} /></Button> : null}</div> : null}
          {questions.isLoading ? (
            <div className="grid gap-2" aria-label="در حال دریافت سؤال‌ها">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-slate-100" />)}</div>
          ) : questions.isError ? (
            <EmptyState title="دریافت سؤال‌ها ناموفق بود؛ اتصال را بررسی و دوباره تلاش کنید." action={<Button variant="soft" onClick={() => void questions.refetch()}>تلاش دوباره</Button>} />
          ) : visibleQuestions.length ? (
            <div className="grid min-h-0 gap-3 overflow-y-auto pl-1">
              {visibleQuestions.map((question, index) => (
                <article
                  key={question.id || index}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          !!question.id && selected.includes(question.id)
                        }
                        onChange={(e) =>
                          question.id &&
                          setSelected((items) =>
                            e.target.checked
                              ? [...new Set([...items, question.id!])]
                              : items.filter((id) => id !== question.id),
                          )
                        }
                      />
                      <strong>سؤال {questionNumber(question, index + 1).toLocaleString("fa-IR")}</strong>
                    </label>
                    {question.id ? (
                      <div className="flex gap-1">
                        <Button
                          className="h-8 px-2"
                          variant="ghost"
                          onClick={() => editQuestion(question, index)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          className="h-8 px-2"
                          variant="danger"
                          onClick={() =>
                            void modal
                              .confirm({
                                title: "حذف سؤال؟",
                                description: "این سؤال از آزمون حذف می‌شود.",
                                tone: "danger",
                                confirmLabel: "حذف",
                              })
                              .then(
                                (confirmed) =>
                                  confirmed && remove.mutate(question.id!),
                              )
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-7">
                    {question.question || question.text}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {(
                      question.options ||
                      [
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d,
                      ].filter((option): option is string => !!option)
                    ).map((option, optionIndex) => {
                      const key = ["a", "b", "c", "d"][optionIndex];
                      const active =
                        (question.correctOption ||
                          question.correct_option ||
                          question.correctAnswer) === key;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-emerald-50 text-emerald-800" : "bg-slate-50"}`}
                        >
                          {active ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            <span className="size-[15px]" />
                          )}
                          {option}
                        </div>
                      );
                    })}
                  </div>
                  {question.explanation || question.hint ? <details className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"><summary className="cursor-pointer font-semibold">توضیح و راهنمای مرور</summary>{question.explanation ? <p className="mt-2">{question.explanation}</p> : null}{question.hint ? <p className="mt-2 text-xs">راهنما: {question.hint}</p> : null}</details> : null}
                  {[
                    question.book,
                    question.chapter,
                    question.lesson,
                    question.topic,
                  ].some(Boolean) ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {[
                        question.book,
                        question.chapter,
                        question.lesson,
                        question.topic,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                examId
                  ? "سؤالی برای نمایش نیست."
                  : "ابتدا یک آزمون انتخاب کنید."
              }
            />
          )}
        </Card>
      </section>
    </div>
  );

  function editQuestion(question: QuestionView, index: number) {
    setEditingId(question.id || "");
    setForm(questionDraft(question, index));
  }
}
