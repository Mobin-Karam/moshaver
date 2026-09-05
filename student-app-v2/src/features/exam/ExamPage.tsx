import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, GraduationCap, XCircle } from 'lucide-react';
import { buildAttemptAnswers, remainingQuizSeconds, unansweredCount, type QuizRun } from '@moshaver/student-core';
import { useStudentStore } from '../../services/student-store';
import { apiClient } from '../../services/api-client';

type Selected = Record<string, 'a' | 'b' | 'c' | 'd' | null>;
type Result = {
  score: number;
  correct: number;
  total: number;
  review?: Array<{ questionId: string; question: string; selectedOption: string | null; correctOption: string; explanation?: string; isCorrect: boolean }>;
};

type ExamDraft = {
  run: QuizRun;
  selected: Selected;
  index: number;
};

const EXAM_DRAFT_KEY = 'moshaver_v2_exam_draft';

export function ExamPage() {
  const exams = useStudentStore((state) => state.exams);
  const loadExams = useStudentStore((state) => state.loadExams);
  const [run, setRun] = useState<QuizRun | null>(null);
  const [selected, setSelected] = useState<Selected>({});
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const remaining = useMemo(() => (run ? remainingQuizSeconds(run, now) : 0), [now, run]);
  const question = run?.quiz.questions[index];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const draft = readDraft();
    if (!draft || !draft.run.quiz.questions.length) return;
    setRun(draft.run);
    setSelected(draft.selected);
    setIndex(Math.min(Math.max(0, draft.index), draft.run.quiz.questions.length - 1));
  }, []);

  useEffect(() => {
    if (run) saveDraft({ run, selected, index });
  }, [index, run, selected]);

  useEffect(() => {
    if (run && remaining === 0 && !result && !busy) void submit();
  }, [remaining, run, result, busy]);

  async function start(examId: string) {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const next = await apiClient.request<QuizRun>('POST', `/student/exams/${examId}/start`);
      setRun(next);
      setSelected({});
      setIndex(0);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      const answers = buildAttemptAnswers(run.quiz.questions.map((item) => item.id), selected);
      const next = await apiClient.request<Result, { answers: typeof answers }>('POST', `/student/exams/${run.quiz.examId}/submit`, { answers });
      setResult(next);
      setRun(null);
      clearDraft();
      void loadExams();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="space-y-4">
        <button className="flex items-center gap-2 text-sm text-ink/65" onClick={() => setResult(null)}><ArrowRight size={16} />بازگشت</button>
        <article className="surface p-4">
          <h1 className="text-xl font-semibold">نتیجه آزمون</h1>
          <strong className="mt-3 block text-3xl">{result.score}%</strong>
          <p className="text-sm text-ink/60">{result.correct} پاسخ درست از {result.total} سؤال</p>
        </article>
        <div className="space-y-3">
          {(result.review ?? []).map((item, i) => (
            <article key={item.questionId} className="surface p-4">
              <div className="flex items-start gap-2">
                {item.isCorrect ? <CheckCircle2 className="mt-1 shrink-0 text-mint" size={18} /> : <XCircle className="mt-1 shrink-0 text-red-600" size={18} />}
                <div>
                  <strong className="block">سؤال {i + 1}</strong>
                  <p className="mt-1 text-sm leading-7">{item.question}</p>
                  <p className="mt-2 text-xs text-ink/60">پاسخ شما: {optionLabel(item.selectedOption)} | پاسخ درست: {optionLabel(item.correctOption)}</p>
                  {item.explanation ? <p className="mt-2 rounded-md bg-paper px-3 py-2 text-sm text-ink/70">{item.explanation}</p> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (run && question) {
    const ids = run.quiz.questions.map((item) => item.id);
    const answeredCount = ids.length - unansweredCount(ids, selected);
    const progress = ids.length ? Math.round((answeredCount / ids.length) * 100) : 0;
    return (
      <section className="space-y-4">
        <div className="surface sticky top-[73px] z-10 p-3">
          <div className="flex items-center justify-between">
            <strong>{run.quiz.title}</strong>
            <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm ${remaining < 120 ? 'bg-red-50 text-red-700' : 'bg-mint/15 text-mint'}`} dir="ltr"><Clock3 size={15} />{formatSeconds(remaining)}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full bg-mint" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink/60">
            <span>پاسخ داده‌شده: {answeredCount} از {run.quiz.questions.length} ({progress}٪)</span>
            <span>سؤال {index + 1} از {run.quiz.questions.length} | بی‌پاسخ: {unansweredCount(ids, selected)}</span>
          </div>
        </div>

        <article className="surface p-4">
          <p className="text-sm leading-8">{question.question}</p>
          <div className="mt-4 grid gap-2">
            {question.options.map((option, optionIndex) => {
              const key = ['a', 'b', 'c', 'd'][optionIndex] as 'a' | 'b' | 'c' | 'd';
              const active = selected[question.id] === key;
              return (
                <button type="button" key={key} aria-pressed={active} className={`rounded-md border px-3 py-3 text-right text-sm ${active ? 'border-ink bg-ink text-white' : 'border-black/10 bg-white'}`} onClick={() => setSelected((current) => ({ ...current, [question.id]: key }))}>
                  {optionLabel(key)}. {option || 'گزینه خالی'}
                </button>
              );
            })}
          </div>
        </article>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-md bg-paper px-4 py-3 disabled:opacity-50" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>قبلی</button>
          {index + 1 === run.quiz.questions.length ? (
            <button className="rounded-md bg-ink px-4 py-3 text-white disabled:opacity-50" disabled={busy} onClick={() => void submit()}>ثبت آزمون</button>
          ) : (
            <button className="rounded-md bg-ink px-4 py-3 text-white" onClick={() => setIndex((value) => Math.min(run.quiz.questions.length - 1, value + 1))}>بعدی</button>
          )}
        </div>
        <button className="w-full rounded-md border border-red-200 px-4 py-2 text-sm text-red-700" onClick={() => { clearDraft(); setRun(null); setSelected({}); setIndex(0); }}>حذف پیش‌نویس و خروج</button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <span className="text-xs text-ink/60">آزمون‌های فعال</span>
        <h1 className="mt-1 text-2xl font-semibold">آزمون</h1>
      </div>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {exams.length ? (
        exams.map((exam) => (
          <article key={exam.id} className="surface p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-saffron/15 text-saffron">
                <GraduationCap size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{exam.title}</h2>
                <p className="mt-1 text-sm text-ink/65">
                  {exam.durationMinutes || 0} دقیقه | {exam.delivery?.questionCount || 0} سوال | {exam.maxAttempts || 1} تلاش
                </p>
                <div className="mt-3 space-y-1 text-xs text-ink/60">
                  {exam.openAt ? <p>شروع: {formatDate(exam.openAt)}</p> : null}
                  {exam.closeAt ? <p>پایان: {formatDate(exam.closeAt)}</p> : null}
                  <p>تلاش‌ها: {exam.delivery?.attemptsUsed ?? 0} از {exam.delivery?.allowedAttempts ?? exam.maxAttempts ?? 1}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy || !exam.delivery?.questionCount || exam.delivery?.canStart === false} onClick={() => void start(exam.id)}>
                    {readDraft()?.run.quiz.examId === exam.id ? 'ادامه آزمون' : 'شروع آزمون'}
                  </button>
                  {readDraft()?.run.quiz.examId === exam.id ? <button className="rounded-md bg-paper px-4 py-2 text-sm" onClick={() => { clearDraft(); setRun(null); setSelected({}); setIndex(0); }}>حذف پیش‌نویس</button> : null}
                </div>
                {exam.delivery?.canStart === false && exam.delivery.reason ? <p className="mt-2 text-xs text-red-700">{exam.delivery.reason}</p> : null}
              </div>
            </div>
          </article>
        ))
      ) : (
        <article className="surface p-4 text-sm text-ink/60">آزمونی در backend-v2 ثبت نشده است.</article>
      )}
    </section>
  );
}

function optionLabel(value?: string | null) {
  if (value === 'a') return 'گزینه ۱';
  if (value === 'b') return 'گزینه ۲';
  if (value === 'c') return 'گزینه ۳';
  if (value === 'd') return 'گزینه ۴';
  return 'بدون پاسخ';
}

function formatSeconds(value: number) {
  const minute = String(Math.floor(value / 60)).padStart(2, '0');
  const second = String(value % 60).padStart(2, '0');
  return `${minute}:${second}`;
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'درخواست ناموفق بود.';
}

function readDraft(): ExamDraft | null {
  try {
    const value = localStorage.getItem(EXAM_DRAFT_KEY);
    if (!value) return null;
    const draft = JSON.parse(value) as Partial<ExamDraft>;
    if (!draft.run?.runId || !draft.run.quiz?.questions?.length || !draft.selected) return null;
    return { run: draft.run, selected: draft.selected, index: Number(draft.index || 0) };
  } catch {
    return null;
  }
}

function saveDraft(draft: ExamDraft) {
  try {
    localStorage.setItem(EXAM_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    return;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(EXAM_DRAFT_KEY);
  } catch {
    return;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
