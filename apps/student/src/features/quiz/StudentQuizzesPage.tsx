import {
  ArrowRight,
  ArrowUpLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { apiClient } from '../../services/api-client';
import './student-quizzes.css';

type QuizSummary = {
  id: string;
  title: string;
  subject?: string;
  durationMinutes: number;
  questionCount: number;
  attempt?: { id: string; submittedAt?: string | null; percent: number } | null;
};
type QuizQuestion = { id: string; text: string; options: string[] };
type QuizRun = {
  runId: string;
  deadline: string;
  remainingSeconds: number;
  savedAnswers: Array<{ questionId: string; selectedOption?: string | null }>;
  quiz: {
    id: string;
    title: string;
    durationMinutes: number;
    questions: QuizQuestion[];
  };
};
type QuizResult = {
  id: string;
  quizId: string;
  correct: number;
  wrong: number;
  blank: number;
  percent: number;
  review: Array<{
    questionId: string;
    selectedOption: string | null;
    correctOption: string;
    explanation?: string;
    isCorrect: boolean;
  }>;
};
type Screen = 'list' | 'preview' | 'run' | 'review' | 'result';

export function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [revision, setRevision] = useState(0);
  const [screen, setScreen] = useState<Screen>('list');
  const [selected, setSelected] = useState<QuizSummary | null>(null);
  const [run, setRun] = useState<QuizRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setQuizzes(
        await apiClient.request<QuizSummary[]>('GET', '/student/quizzes'),
      );
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, revision]);

  async function start() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const next = await apiClient.request<QuizRun>(
        'POST',
        `/quizzes/${encodeURIComponent(selected.id)}/start`,
      );
      setRun(next);
      setAnswers(
        Object.fromEntries(
          next.savedAnswers
            .filter((item) => item.selectedOption)
            .map((item) => {
              const question = next.quiz.questions.find(
                (candidate) => candidate.id === item.questionId,
              );
              return [
                item.questionId,
                answerKey(question?.options || [], item.selectedOption),
              ];
            })
            .filter(([, value]) => value),
        ),
      );
      setIndex(0);
      setScreen('run');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'شروع آزمونک ناموفق بود.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!run) return;
    setBusy(true);
    setError('');
    try {
      const value = await apiClient.request<QuizResult>(
        'POST',
        `/quizzes/${encodeURIComponent(run.quiz.id)}/attempts`,
        {
          runId: run.runId,
          answers: run.quiz.questions.map((question) => ({
            questionId: question.id,
            selectedOption: answers[question.id] || null,
          })),
        },
      );
      setResult(value);
      setRun(null);
      setScreen('result');
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ثبت پاسخ‌ها ناموفق بود.',
      );
    } finally {
      setBusy(false);
    }
  }

  function returnToList() {
    setSelected(null);
    setRun(null);
    setResult(null);
    setError('');
    setScreen('list');
  }

  if (screen === 'preview' && selected)
    return (
      <QuizPreview
        quiz={selected}
        busy={busy}
        error={error}
        onBack={returnToList}
        onStart={() => void start()}
      />
    );
  if ((screen === 'run' || screen === 'review') && run)
    return (
      <QuizRunner
        run={run}
        answers={answers}
        index={index}
        reviewing={screen === 'review'}
        busy={busy}
        error={error}
        onAnswer={(questionId, option) =>
          setAnswers((current) => ({ ...current, [questionId]: option }))
        }
        onIndex={setIndex}
        onReview={() => setScreen('review')}
        onContinue={() => setScreen('run')}
        onSubmit={() => void submit()}
      />
    );
  if (screen === 'result' && result)
    return <QuizResultPanel result={result} onClose={returnToList} />;

  return (
    <section
      className="student-quizzes"
      aria-labelledby="student-quizzes-title"
    >
      <header className="resource-library__header">
        <div>
          <small>تمرین کوتاه، بدون فشار اضافه</small>
          <h1 id="student-quizzes-title">آزمونک‌ها</h1>
          <p>اول جزئیات را ببین؛ پاسخ‌ها تا ثبت نهایی قابل تغییرند.</p>
        </div>
        <Link to="/more" aria-label="بازگشت به بیشتر">
          <ArrowUpLeft />
        </Link>
      </header>
      {error ? (
        <div className="quiz-inline-error" role="alert">
          {error}
        </div>
      ) : null}
      {status === 'loading' ? (
        <LoadingState label="در حال دریافت آزمونک‌ها" />
      ) : null}
      {status === 'error' ? (
        <ErrorState
          message="دریافت آزمونک‌ها ناموفق بود."
          onRetry={() => setRevision((value) => value + 1)}
        />
      ) : null}
      {status === 'ready' && !quizzes.length ? (
        <EmptyState title="آزمونک فعالی برای شما وجود ندارد." />
      ) : null}
      {status === 'ready' && quizzes.length ? (
        <div className="student-quizzes__list">
          {quizzes.map((quiz) => (
            <article key={quiz.id} className="student-quiz-card">
              <span>
                <ListChecks aria-hidden="true" />
              </span>
              <div>
                <small>{quiz.subject || 'آزمونک عمومی'}</small>
                <h2>{quiz.title}</h2>
                <p>
                  <Clock3 aria-hidden="true" />
                  {quiz.durationMinutes.toLocaleString('fa-IR')} دقیقه ·{' '}
                  {quiz.questionCount.toLocaleString('fa-IR')} سؤال
                </p>
                {quiz.attempt?.submittedAt ? (
                  <strong>
                    <CheckCircle2 aria-hidden="true" />
                    آخرین نتیجه: {quiz.attempt.percent.toLocaleString('fa-IR')}٪
                  </strong>
                ) : null}
              </div>
              <button
                disabled={busy || !quiz.questionCount}
                onClick={() => {
                  setSelected(quiz);
                  setScreen('preview');
                }}
              >
                {quiz.attempt?.submittedAt ? (
                  <>
                    <RotateCcw />
                    تلاش دوباره
                  </>
                ) : (
                  <>
                    <Sparkles />
                    مشاهده و شروع
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QuizPreview({
  quiz,
  busy,
  error,
  onBack,
  onStart,
}: {
  quiz: QuizSummary;
  busy: boolean;
  error: string;
  onBack(): void;
  onStart(): void;
}) {
  return (
    <section className="quiz-focus-shell" aria-labelledby="quiz-preview-title">
      <button className="quiz-back" onClick={onBack}>
        <ArrowRight />
        بازگشت به آزمونک‌ها
      </button>
      <article className="quiz-preview-card">
        <span className="quiz-eyebrow">{quiz.subject || 'تمرین عمومی'}</span>
        <h1 id="quiz-preview-title">{quiz.title}</h1>
        <p>
          این یک تمرین کوتاه است. هر سؤال را جدا می‌بینی و پیش از ثبت نهایی فرصت
          مرور داری.
        </p>
        <dl>
          <div>
            <dt>تعداد سؤال</dt>
            <dd>{quiz.questionCount.toLocaleString('fa-IR')}</dd>
          </div>
          <div>
            <dt>زمان پیشنهادی</dt>
            <dd>{quiz.durationMinutes.toLocaleString('fa-IR')} دقیقه</dd>
          </div>
        </dl>
      </article>
      <div className="quiz-reassurance" role="note">
        <ShieldCheck aria-hidden="true" />
        <p>
          <strong>با آرامش پیش برو</strong>
          <span>
            پاسخت با انتخاب گزینه حفظ می‌شود و تا پایان قابل تغییر است.
          </span>
        </p>
      </div>
      {error ? (
        <p className="quiz-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="quiz-primary" disabled={busy} onClick={onStart}>
        {busy ? 'در حال آماده‌سازی…' : 'آماده‌ام؛ شروع کنیم'}
      </button>
    </section>
  );
}

function QuizRunner({
  run,
  answers,
  index,
  reviewing,
  busy,
  error,
  onAnswer,
  onIndex,
  onReview,
  onContinue,
  onSubmit,
}: {
  run: QuizRun;
  answers: Record<string, string>;
  index: number;
  reviewing: boolean;
  busy: boolean;
  error: string;
  onAnswer(questionId: string, option: string): void;
  onIndex(index: number): void;
  onReview(): void;
  onContinue(): void;
  onSubmit(): void;
}) {
  const [remaining, setRemaining] = useState(run.remainingSeconds);
  const submitted = useRef(false);
  const submitRef = useRef(onSubmit);
  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);
  useEffect(() => {
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (remaining > 0 || submitted.current) return;
    submitted.current = true;
    submitRef.current();
  }, [remaining]);
  if (reviewing)
    return (
      <QuizReview
        run={run}
        answers={answers}
        remaining={remaining}
        busy={busy}
        error={error}
        onIndex={(next) => {
          onIndex(next);
          onContinue();
        }}
        onContinue={onContinue}
        onSubmit={() => {
          submitted.current = true;
          onSubmit();
        }}
      />
    );
  const question = run.quiz.questions[index];
  if (!question)
    return <p className="quiz-inline-error">سؤال قابل نمایش نیست.</p>;
  const progress = ((index + 1) / run.quiz.questions.length) * 100;
  return (
    <section className="quiz-focus-shell" aria-labelledby="quiz-question-title">
      <header className="quiz-run-header">
        <div>
          <small>{run.quiz.title}</small>
          <strong>
            سؤال {(index + 1).toLocaleString('fa-IR')} از{' '}
            {run.quiz.questions.length.toLocaleString('fa-IR')}
          </strong>
        </div>
        <span
          className={remaining <= 60 ? 'is-urgent' : ''}
          role="timer"
          aria-label={`${formatTime(remaining)} زمان باقی‌مانده`}
        >
          <Clock3 aria-hidden="true" />
          <b dir="ltr">{formatTime(remaining)}</b>
        </span>
      </header>
      <div
        className="quiz-progress"
        aria-label={`${Math.round(progress)} درصد مسیر آزمونک`}
      >
        <span style={{ inlineSize: `${progress}%` }} />
      </div>
      <article className="quiz-question-card">
        <span className="quiz-eyebrow">
          {answered.toLocaleString('fa-IR')} پاسخ ثبت‌شده
        </span>
        <h1 id="quiz-question-title">{question.text}</h1>
        <fieldset>
          <legend className="sr-only">یک گزینه را انتخاب کن</legend>
          {question.options.map((option, optionIndex) => {
            const key = optionKey(optionIndex);
            const active = answers[question.id] === key;
            return (
              <label
                key={`${question.id}-${optionIndex}`}
                className={active ? 'is-selected' : ''}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={key}
                  checked={active}
                  onChange={() => onAnswer(question.id, key)}
                />
                <span className="quiz-option-key">
                  {(optionIndex + 1).toLocaleString('fa-IR')}
                </span>
                <span>{option}</span>
                {active ? <Check aria-hidden="true" /> : null}
              </label>
            );
          })}
        </fieldset>
      </article>
      {error ? (
        <p className="quiz-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="quiz-run-actions">
        <button
          className="quiz-secondary"
          disabled={index === 0}
          onClick={() => onIndex(index - 1)}
        >
          <ChevronRight />
          قبلی
        </button>
        {index === run.quiz.questions.length - 1 ? (
          <button className="quiz-primary" onClick={onReview}>
            <ListChecks />
            مرور پاسخ‌ها
          </button>
        ) : (
          <button className="quiz-primary" onClick={() => onIndex(index + 1)}>
            بعدی
            <ChevronLeft />
          </button>
        )}
      </footer>
    </section>
  );
}

function QuizReview({
  run,
  answers,
  remaining,
  busy,
  error,
  onIndex,
  onContinue,
  onSubmit,
}: {
  run: QuizRun;
  answers: Record<string, string>;
  remaining: number;
  busy: boolean;
  error: string;
  onIndex(index: number): void;
  onContinue(): void;
  onSubmit(): void;
}) {
  const answered = run.quiz.questions.filter(
    (question) => answers[question.id],
  ).length;
  const blank = run.quiz.questions.length - answered;
  return (
    <section className="quiz-focus-shell" aria-labelledby="quiz-review-title">
      <header className="quiz-review-header">
        <span>یک مرور کوتاه</span>
        <h1 id="quiz-review-title">آماده ثبت نهایی هستی؟</h1>
        <p>هنوز می‌توانی به هر سؤال برگردی و پاسخت را تغییر بدهی.</p>
        <b dir="ltr">
          <Clock3 aria-hidden="true" />
          {formatTime(remaining)}
        </b>
      </header>
      <div className="quiz-review-summary">
        <p>
          <strong>{answered.toLocaleString('fa-IR')}</strong>
          <span>پاسخ‌داده‌شده</span>
        </p>
        <p>
          <strong>{blank.toLocaleString('fa-IR')}</strong>
          <span>بی‌پاسخ</span>
        </p>
      </div>
      <nav className="quiz-answer-sheet" aria-label="مرور سؤال‌ها">
        {run.quiz.questions.map((question, questionIndex) => (
          <button
            key={question.id}
            className={answers[question.id] ? 'is-answered' : ''}
            aria-label={`سؤال ${(questionIndex + 1).toLocaleString('fa-IR')}، ${answers[question.id] ? 'پاسخ داده شده' : 'بدون پاسخ'}`}
            onClick={() => onIndex(questionIndex)}
          >
            {(questionIndex + 1).toLocaleString('fa-IR')}
          </button>
        ))}
      </nav>
      {blank ? (
        <p className="quiz-gentle-warning">
          {blank.toLocaleString('fa-IR')} سؤال بی‌پاسخ است؛ می‌توانی برگردی یا
          همین حالا ثبت کنی.
        </p>
      ) : null}
      {error ? (
        <p className="quiz-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="quiz-run-actions">
        <button className="quiz-secondary" onClick={onContinue}>
          ادامه مرور
        </button>
        <button className="quiz-primary" disabled={busy} onClick={onSubmit}>
          {busy ? 'در حال ثبت…' : 'ثبت نهایی و دیدن نتیجه'}
        </button>
      </div>
    </section>
  );
}

function QuizResultPanel({
  result,
  onClose,
}: {
  result: QuizResult;
  onClose(): void;
}) {
  const message =
    result.percent >= 80
      ? 'آفرین؛ تسلط خوبی نشان دادی.'
      : result.percent >= 50
        ? 'خوب پیش رفتی؛ مرور پاسخ‌ها کمکت می‌کند.'
        : 'این فقط یک تمرین بود؛ حالا دقیق‌تر می‌دانی چه چیزی را مرور کنی.';
  return (
    <section className="quiz-focus-shell" aria-labelledby="quiz-result-title">
      <header className="student-quiz-result">
        <CheckCircle2 aria-hidden="true" />
        <span>تمرین کامل شد</span>
        <h1 id="quiz-result-title">{message}</h1>
        <strong>{result.percent.toLocaleString('fa-IR')}٪</strong>
        <p>
          {result.correct.toLocaleString('fa-IR')} درست ·{' '}
          {result.wrong.toLocaleString('fa-IR')} نیازمند مرور ·{' '}
          {result.blank.toLocaleString('fa-IR')} بی‌پاسخ
        </p>
      </header>
      <section
        className="quiz-result-review"
        aria-labelledby="quiz-result-review-title"
      >
        <h2 id="quiz-result-review-title">مرور یادگیری</h2>
        {result.review.map((item, index) => (
          <article
            key={item.questionId}
            className={item.isCorrect ? 'is-correct' : 'is-wrong'}
          >
            <b>سؤال {(index + 1).toLocaleString('fa-IR')}</b>
            <span>
              {item.isCorrect
                ? 'پاسخت درست بود'
                : `پاسخ درست: ${optionLabel(item.correctOption)}`}
            </span>
            {item.explanation ? <p>{item.explanation}</p> : null}
          </article>
        ))}
      </section>
      <button className="quiz-primary" onClick={onClose}>
        بازگشت به آزمونک‌ها
      </button>
    </section>
  );
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function optionKey(index: number) {
  return ['a', 'b', 'c', 'd'][index] || '';
}

function answerKey(options: string[], answer?: string | null) {
  const normalized = (answer || '').trim().toLowerCase();
  if (['a', 'b', 'c', 'd'].includes(normalized)) return normalized;
  return optionKey(options.indexOf(answer || ''));
}

function optionLabel(value?: string | null) {
  const index = ['a', 'b', 'c', 'd'].indexOf(value || '');
  return index >= 0 ? `گزینه ${(index + 1).toLocaleString('fa-IR')}` : 'بدون پاسخ';
}
