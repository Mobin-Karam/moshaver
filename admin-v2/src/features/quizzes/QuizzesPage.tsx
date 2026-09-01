import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Power, RotateCcw, Save, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../shared/ui/ui";
import { api } from "../../shared/api/api";
import { useModal } from "../../shared/ui/modal";
import { notify } from "../../shared/ui/notifications";
import { emptyQuestion, questionDraft, questionError, questionMatches, type QuestionView } from "../questions/question-model";

type Quiz = {
  id: string;
  title: string;
  subject?: string;
  duration_minutes?: number;
  active?: number | boolean;
  exam_id?: string;
  exam_title?: string;
  question_count?: number;
};
type Question = QuestionView & { id: string };

export function QuizzesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [quizId, setQuizIdState] = useState(params.get("quizId") || "");
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [search, setSearch] = useState(params.get("question") || "");
  const [quizSearch, setQuizSearch] = useState(params.get("q") || "");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [quiz, setQuiz] = useState({
    title: "",
    subject: "",
    durationMinutes: 20,
  });
  const [question, setQuestion] = useState(emptyQuestion);
  const modal = useModal();
  const quizzes = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => api.get<Quiz[]>("/admin/quizzes"),
  });
  const questions = useQuery({
    queryKey: ["quiz-questions", quizId],
    enabled: !!quizId,
    queryFn: () => api.get<Question[]>(`/admin/quizzes/${quizId}/questions`),
  });
  const selected = quizzes.data?.find((item) => item.id === quizId);
  const visibleQuizzes = (quizzes.data || []).filter((item) => {
    const matchesSearch = `${item.title} ${item.subject || ""} ${item.exam_title || ""}`.toLocaleLowerCase("fa").includes(quizSearch.trim().toLocaleLowerCase("fa"));
    const matchesStatus = status === "all" || (status === "active" ? !!item.active : !item.active);
    return matchesSearch && matchesStatus;
  });
  function setQuizId(value: string) { setQuizIdState(value); setParams((current) => { const next = new URLSearchParams(current); value ? next.set("quizId", value) : next.delete("quizId"); return next; }, { replace: true }); }
  function syncFilter(key: "q" | "status" | "question", value: string, fallback = "") { setParams((current) => { const next = new URLSearchParams(current); value && value !== fallback ? next.set(key, value) : next.delete(key); return next; }, { replace: true }); }
  useEffect(() => {
    if (!quizId && quizzes.data?.[0]) setQuizId(quizzes.data[0].id);
  }, [quizId, quizzes.data]);
  useEffect(() => {
    if (quizId && quizzes.isSuccess && !selected) {
      setQuizId("");
      notify("آزمونک انتخاب‌شده دیگر وجود ندارد.", "warning");
    }
  }, [quizId, quizzes.isSuccess, selected]);
  useEffect(() => {
    if (selected)
      setQuiz({
        title: selected.title,
        subject: selected.subject || "",
        durationMinutes: selected.duration_minutes || 20,
      });
  }, [selected?.id]);
  const save = useMutation({
    mutationFn: () =>
      quizId
        ? api.patch(`/admin/quizzes/${quizId}`, quiz)
        : api.post<{ id: string }>("/admin/quizzes", quiz),
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      notify(quizId ? "آزمونک به‌روز شد." : "آزمونک ساخته شد.");
      if (value && typeof value === "object" && "id" in value)
        setQuizId(String(value.id));
    },
    onError: (error) => notify(error instanceof Error ? error.message : "ذخیره آزمونک ناموفق بود.", "error"),
  });
  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/admin/quizzes/${quizId}`, { active: !selected?.active }),
    onSuccess: () => { notify(selected?.active ? "آزمونک غیرفعال شد." : "آزمونک فعال شد."); void qc.invalidateQueries({ queryKey: ["quizzes"] }); },
    onError: (error) => notify(error instanceof Error ? error.message : "تغییر وضعیت آزمونک ناموفق بود.", "error"),
  });
  const add = useMutation({
    mutationFn: () => editingQuestionId ? api.patch(`/admin/questions/${editingQuestionId}`, question) : api.post(`/admin/quizzes/${quizId}/questions`, question),
    onSuccess: () => {
      notify(editingQuestionId ? "سؤال آزمونک ویرایش شد." : "سؤال آزمونک افزوده شد.");
      setQuestion(emptyQuestion());
      setEditingQuestionId("");
      qc.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
    },
    onError: (error) => notify(error instanceof Error ? error.message : "ذخیره سؤال ناموفق بود.", "error"),
  });
  const visibleQuestions = (questions.data ?? []).filter((item) => questionMatches(item, search));
  const validationError = questionError(question);
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/questions/${id}`),
    onSuccess: () => { notify("سؤال حذف شد."); void qc.invalidateQueries({ queryKey: ["quiz-questions", quizId] }); },
    onError: (error) => notify(error instanceof Error ? error.message : "حذف سؤال ناموفق بود.", "error"),
  });
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="self-start lg:sticky lg:top-20">
          <Button
            className="mb-3 w-full"
            variant="soft"
            onClick={() => {
              setQuizId("");
              setQuiz({ title: "", subject: "", durationMinutes: 20 });
            }}
          >
            آزمونک جدید
          </Button>
          <div className="mb-3 grid gap-2"><div className="relative"><Search className="absolute right-3 top-2.5 text-slate-400" size={16} /><Input className="pr-9" type="search" placeholder="جستجوی آزمونک…" value={quizSearch} onChange={(event) => { setQuizSearch(event.target.value); syncFilter("q", event.target.value); }} /></div><Select value={status} onChange={(event) => { setStatus(event.target.value); syncFilter("status", event.target.value, "all"); }}><option value="all">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></Select></div>
          {quizzes.isLoading ? (
            <div className="grid gap-2">{[1,2,3].map((item) => <div key={item} className="h-16 animate-pulse rounded-md bg-slate-100" />)}</div>
          ) : quizzes.isError ? (
            <EmptyState title="دریافت آزمونک‌ها ناموفق بود." action={<Button variant="soft" onClick={() => void quizzes.refetch()}>تلاش دوباره</Button>} />
          ) : visibleQuizzes.length ? (
            <div className="grid max-h-[calc(100dvh-21rem)] gap-2 overflow-y-auto">
              {visibleQuizzes.map((item) => (
                <button
                  key={item.id}
                  className={`rounded-md border p-3 text-right ${quizId === item.id ? "border-brand bg-teal-50" : ""}`}
                  onClick={() => setQuizId(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{item.subject || "بدون درس"}</span>
                    <Badge tone={item.active ? "green" : "neutral"}>
                      {item.active ? "فعال" : "غیرفعال"}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">{item.question_count || 0} سؤال{item.exam_title ? ` • ${item.exam_title}` : ""}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title={quizSearch || status !== "all" ? "آزمونکی با این فیلتر پیدا نشد." : "آزمونکی ثبت نشده است."} action={quizSearch || status !== "all" ? <Button variant="ghost" onClick={() => { setQuizSearch(""); setStatus("all"); syncFilter("q", ""); syncFilter("status", "all", "all"); }}><RotateCcw size={15} /> پاک‌کردن فیلترها</Button> : undefined} />
          )}
        </Card>
        <div className="grid gap-4">
          <Card>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="عنوان">
                <Input
                  value={quiz.title}
                  onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                />
              </Field>
              <Field label="درس">
                <Input
                  value={quiz.subject}
                  onChange={(e) =>
                    setQuiz({ ...quiz, subject: e.target.value })
                  }
                />
              </Field>
              <Field label="مدت (دقیقه)">
                <Input
                  type="number"
                  value={quiz.durationMinutes}
                  onChange={(e) =>
                    setQuiz({
                      ...quiz,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                loading={save.isPending}
                disabled={!quiz.title.trim() || quiz.durationMinutes < 1 || quiz.durationMinutes > 360 || save.isPending}
                onClick={() => save.mutate()}
              >
                <Save size={16} />
                ذخیره
              </Button>
              {quizId ? (
                <Button
                  variant="soft"
                  onClick={() =>
                    void modal
                      .confirm({
                        title: selected?.active
                          ? "غیرفعال‌کردن آزمونک؟"
                          : "فعال‌کردن آزمونک؟",
                        description: selected?.active
                          ? "دانش‌آموزان دیگر به این آزمونک دسترسی نخواهند داشت."
                          : "آزمونک دوباره برای دانش‌آموزان قابل استفاده می‌شود.",
                        confirmLabel: selected?.active
                          ? "غیرفعال کن"
                          : "فعال کن",
                      })
                      .then((confirmed) => confirmed && toggle.mutate())
                  }
                >
                  <Power size={16} />
                  {selected?.active ? "غیرفعال" : "فعال"}
                </Button>
              ) : null}
            </div>
          </Card>
          {quizId ? (
            <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
              <Card>
                <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{editingQuestionId ? "ویرایش سؤال" : "سؤال جدید"}</h3>{editingQuestionId ? <Button className="h-8" variant="ghost" onClick={() => { setEditingQuestionId(""); setQuestion(emptyQuestion()); }}>انصراف</Button> : null}</div>
                <div className="grid gap-2">
                  <Field label="صورت سؤال">
                    <Textarea
                      value={question.question}
                      onChange={(e) =>
                        setQuestion({ ...question, question: e.target.value })
                      }
                    />
                  </Field>
                  {question.options.map((value, index) => (
                    <Field key={index} label={`گزینه ${index + 1}`}>
                      <Input
                        value={value}
                        onChange={(e) =>
                          setQuestion({
                            ...question,
                            options: question.options.map((item, i) =>
                              i === index ? e.target.value : item,
                            ),
                          })
                        }
                      />
                    </Field>
                  ))}
                  <Field label="پاسخ">
                    <Select
                      value={question.correctOption}
                      onChange={(e) =>
                        setQuestion({
                          ...question,
                          correctOption: e.target.value,
                        })
                      }
                    >
                      {["a", "b", "c", "d"].map((key, index) => (
                        <option key={key} value={key}>
                          گزینه {index + 1}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button
                    loading={add.isPending}
                    disabled={
                      !!validationError ||
                      add.isPending
                    }
                    onClick={() => add.mutate()}
                  >
                    {editingQuestionId ? "ذخیره تغییرات" : "افزودن سؤال"}
                  </Button>
                </div>
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">سؤال‌ها</h3><Badge tone="blue">{visibleQuestions.length} سؤال</Badge></div>
                <div className="relative mb-3"><Search className="absolute right-3 top-2.5 text-slate-400" size={16} /><Input className="pr-9" type="search" placeholder="جست‌وجوی سؤال…" value={search} onChange={(event) => { setSearch(event.target.value); syncFilter("question", event.target.value); }} /></div>
                {questions.isLoading ? <div className="grid gap-2">{[1,2,3].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-slate-100" />)}</div> : questions.isError ? <EmptyState title="دریافت سؤال‌ها ناموفق بود." action={<Button variant="soft" onClick={() => void questions.refetch()}>تلاش دوباره</Button>} /> : visibleQuestions.length ? (
                  <div className="grid max-h-[calc(100dvh-25rem)] gap-2 overflow-y-auto pl-1">
                    {visibleQuestions.map((item, index) => (
                      <article key={item.id} className="rounded-md border p-3">
                        <div className="flex justify-between">
                          <strong>سؤال {index + 1}</strong>
                          <div className="flex gap-1"><Button className="h-8 px-2" variant="ghost" onClick={() => { setEditingQuestionId(item.id); setQuestion(questionDraft(item, index)); }}><Pencil size={14} /></Button><Button
                            variant="danger"
                            className="h-8 px-2"
                            onClick={() =>
                              void modal
                                .confirm({
                                  title: "حذف سؤال آزمونک؟",
                                  description:
                                    "این سؤال برای همیشه از آزمونک حذف می‌شود.",
                                  tone: "danger",
                                  confirmLabel: "حذف",
                                })
                                .then(
                                  (confirmed) =>
                                    confirmed && remove.mutate(item.id),
                                )
                            }
                          >
                            حذف
                          </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm">
                          {item.question_text || item.question}
                        </p>
                        <span className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 size={14} />
                          پاسخ {item.correct_option}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="سؤالی ثبت نشده است." />
                )}
              </Card>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
