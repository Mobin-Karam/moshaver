import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListChecks, Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../components/ui";
import { api } from "../../services/api";
import type { Exam } from "../../types/domain";
import { useModal } from "../../components/modal";
import { notify } from "../../components/toast";
import { emptyQuestion, questionDraft, questionError, questionMatches, type QuestionView } from "./question-model";
import { StudentPicker } from "../../components/StudentPicker";
import { useStudents } from "../../hooks/useStudents";

export function QuestionsPage() {
  const [params, setParams] = useSearchParams();
  const students = useStudents();
  const [examId, setExamIdState] = useState(params.get("examId") || "");
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyQuestion);
  const qc = useQueryClient();
  const modal = useModal();
  useEffect(() => {
    const studentId = params.get("studentId");
    if (studentId) students.setStudentId(studentId);
  }, [params.get("studentId")]);
  useEffect(() => setExamIdState(params.get("examId") || ""), [params.get("examId")]);
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
        ? api.patch(`/admin/questions/${editingId}`, form)
        : api.post(`/admin/exams/${examId}/questions`, form),
    onSuccess: () => {
      setForm(emptyQuestion());
      setEditingId("");
      notify(editingId ? "سؤال ویرایش شد." : "سؤال افزوده شد.");
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/exams/${examId}/questions/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] }),
  });
  const visibleQuestions = (questions.data ?? []).filter((item) => questionMatches(item, search));
  const validationError = questionError(form);
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black">بانک سؤال</h2>
        <p className="text-slate-500">
          افزودن سؤال چهارگزینه‌ای و مشاهده آزمون مثل نسخه قدیمی
        </p>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
        <Field label="دانش‌آموز">
          <StudentPicker students={students.students} value={students.studentId} onChange={(studentId) => { students.setStudentId(studentId); setExamIdState(""); setParams((current) => { current.set("studentId", studentId); current.delete("examId"); return current; }); }} />
        </Field>
        <Field label="آزمون">
          <Select
            value={examId}
            onChange={(e) => {
              setExamIdState(e.target.value);
              setParams((current) => { e.target.value ? current.set("examId", e.target.value) : current.delete("examId"); current.set("studentId", students.studentId); return current; });
              setSelected([]);
            }}
          >
            <option value="">انتخاب آزمون</option>
            {(exams.data ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </Select>
        </Field>
        </div>
      </Card>
      <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
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
                  setForm(emptyQuestion());
                }}
              >
                انصراف
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3">
            <Field label="صورت سؤال">
              <Textarea
                className="min-h-28"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
              />
            </Field>
            {form.options.map((option, i) => (
              <Field key={i} label={`گزینه ${i + 1}`}>
                <Input
                  value={option}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      options: form.options.map((x, index) =>
                        index === i ? e.target.value : x,
                      ),
                    })
                  }
                />
              </Field>
            ))}
            <Field label="پاسخ صحیح">
              <Select
                value={form.correctOption}
                onChange={(e) =>
                  setForm({ ...form, correctOption: e.target.value })
                }
              >
                <option value="a">گزینه ۱</option>
                <option value="b">گزینه ۲</option>
                <option value="c">گزینه ۳</option>
                <option value="d">گزینه ۴</option>
              </Select>
            </Field>
            <Field label="توضیح">
              <Textarea
                className="min-h-20"
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
              />
            </Field>
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="کتاب">
                <Input
                  value={form.book}
                  onChange={(e) => setForm({ ...form, book: e.target.value })}
                />
              </Field>
              <Field label="فصل">
                <Input
                  value={form.chapter}
                  onChange={(e) =>
                    setForm({ ...form, chapter: e.target.value })
                  }
                />
              </Field>
              <Field label="درس">
                <Input
                  value={form.lesson}
                  onChange={(e) => setForm({ ...form, lesson: e.target.value })}
                />
              </Field>
              <Field label="مبحث">
                <Input
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
                value={form.hint}
                onChange={(e) => setForm({ ...form, hint: e.target.value })}
              />
            </Field>
            <Button
              loading={add.isPending}
              disabled={
                !examId ||
                add.isPending ||
                !!validationError
              }
              onClick={() => add.mutate()}
            >
              {editingId ? "ذخیره تغییرات" : "افزودن سؤال"}
            </Button>
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ListChecks size={18} />
            <h3 className="font-bold">سؤال‌های آزمون</h3>
            <span className="mr-auto text-xs text-slate-500">
              {visibleQuestions.length} از {questions.data?.length || 0} سؤال
            </span>
            {selected.length ? (
              <Button
                className="h-8"
                variant="danger"
                onClick={() =>
                  void modal
                    .confirm({
                      title: `حذف ${selected.length} سؤال؟`,
                      tone: "danger",
                      confirmLabel: "حذف همه",
                    })
                    .then(async (ok) => {
                      if (!ok) return;
                      const results = await Promise.allSettled(
                        selected.map((id) =>
                          api.delete(`/admin/exams/${examId}/questions/${id}`),
                        ),
                      );
                      const failed = selected.filter((_, index) => results[index]?.status === "rejected");
                      setSelected(failed);
                      failed.length ? notify(`${failed.length} سؤال حذف نشد و همچنان انتخاب است.`, "warning") : notify("سؤال‌های انتخاب‌شده حذف شدند.");
                      void qc.invalidateQueries({
                        queryKey: ["exam-questions", examId],
                      });
                    })
                }
              >
                حذف انتخاب‌شده
              </Button>
            ) : null}
          </div>
          {examId ? <div className="relative mb-3"><Search className="absolute right-3 top-2.5 text-slate-400" size={16} /><Input className="pr-9" type="search" placeholder="جست‌وجو در متن، مبحث یا گزینه‌ها…" value={search} onChange={(event) => setSearch(event.target.value)} /></div> : null}
          {questions.isLoading ? (
            <div className="grid gap-2" aria-label="در حال دریافت سؤال‌ها">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-slate-100" />)}</div>
          ) : questions.isError ? (
            <EmptyState title="دریافت سؤال‌ها ناموفق بود؛ اتصال را بررسی و دوباره تلاش کنید." />
          ) : visibleQuestions.length ? (
            <div className="grid gap-3">
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
                      <strong>سؤال {index + 1}</strong>
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
                  {question.explanation ? (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {question.explanation}
                    </p>
                  ) : null}
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
