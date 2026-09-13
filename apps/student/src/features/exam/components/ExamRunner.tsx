import { Bookmark, Check, ChevronLeft, ChevronRight, CloudOff, ListChecks, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import { attemptSummary, questionState, type AnswerSaveState, type AttemptAnswer, type QuizRun } from '@moshaver/student-core';
import { useEffect, useRef, useState } from 'react';
import { useRemainingSeconds } from '../exam-timing';

type Props = {
  run: QuizRun;
  answers: Record<string, AttemptAnswer | undefined>;
  index: number;
  saveState: AnswerSaveState;
  receivedAt: number;
  reviewing: boolean;
  busy: boolean;
  error: string;
  onAnswer: (questionId: string, option: AttemptAnswer['selectedOption']) => void;
  onMark: (questionId: string) => void;
  onIndex: (index: number) => void;
  onReview: () => void;
  onContinue: () => void;
  onSubmit: () => void;
};

export function ExamRunner(props: Props) {
  const { run, answers, index, reviewing, onSubmit } = props;
  const remaining = useRemainingSeconds(run, props.receivedAt);
  const warning = timerWarning(remaining, run.quiz.durationMinutes * 60);
  const submittedAtTimeout = useRef(false);
  const ids = run.quiz.questions.map((question) => question.id);
  const summary = attemptSummary(ids, answers);

  useEffect(() => {
    if (remaining !== 0 || submittedAtTimeout.current) return;
    submittedAtTimeout.current = true;
    onSubmit();
  }, [onSubmit, remaining]);

  if (reviewing) {
    return <SubmissionReview {...props} summary={summary} remaining={remaining} />;
  }

  const question = run.quiz.questions[index];
  if (!question) return <p className="state-error">سؤال قابل نمایش نیست.</p>;
  const answer = answers[question.id];
  const allowBack = run.allowBackNavigation !== false;

  return (
    <section className="exam-stage" aria-labelledby="question-title">
      <header className="exam-header">
        <div className="min-w-0"><span className="block truncate text-xs text-white/60">{run.quiz.title}</span><strong className="block truncate">سؤال {index + 1} از {ids.length}</strong></div>
        <div className="text-left"><span className={`timer-chip ${warning === 'one' ? 'timer-danger' : warning ? 'timer-warning' : ''}`} dir="ltr" aria-label={`${formatSeconds(remaining)} زمان باقی‌مانده`}>{formatSeconds(remaining)}</span><SaveStatus state={props.saveState} />{warning ? <span className="sr-only" role="status">{warning === 'one' ? 'یک دقیقه' : warning === 'five' ? 'پنج دقیقه' : 'پانزده دقیقه'} تا پایان آزمون باقی مانده است.</span> : null}</div>
      </header>

      {run.sections?.length ? <SectionTabs run={run} currentQuestionId={question.id} onIndex={props.onIndex} /> : null}

      <div className="exam-question">
        {question.sectionId || question.subject ? <p className="mb-3 text-xs font-bold text-mint">{question.subject || run.sections?.find((section) => section.id === question.sectionId)?.name}</p> : null}
        <h1 id="question-title" className="text-base font-bold leading-8">{question.question}</h1>
        {question.mediaUrl ? <a href={question.mediaUrl} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-2xl border border-ink/10"><img src={question.mediaUrl} alt="تصویر سؤال؛ برای بزرگ‌نمایی لمس کنید" className="max-h-72 w-full object-contain" loading="lazy" /></a> : null}
        <fieldset className="mt-5 grid gap-3"><legend className="sr-only">گزینه پاسخ</legend>{question.options.map((option, optionIndex) => { const key = ['a', 'b', 'c', 'd'][optionIndex] as AttemptAnswer['selectedOption']; const active = answer?.selectedOption === key; return <button type="button" key={key} aria-pressed={active} className={`answer-card ${active ? 'answer-card-selected' : ''}`} onClick={() => props.onAnswer(question.id, active ? null : key)}><span className="answer-key">{toPersian(optionIndex + 1)}</span><span className="flex-1 leading-7">{option || 'گزینه بدون متن'}</span>{active ? <Check className="size-5 shrink-0" aria-hidden="true" /> : null}</button>; })}</fieldset>
        {props.error ? <p className="state-error mt-4" role="alert">{props.error}</p> : null}
      </div>

      <QuestionSheet run={run} answers={answers} current={index} remaining={remaining} onIndex={props.onIndex} />

      <footer className="exam-footer">
        <button className="exam-secondary" disabled={!allowBack || index === 0 || remaining === 0} onClick={() => props.onIndex(index - 1)}><ChevronRight />قبلی</button>
        <button className={`exam-mark ${answer?.marked ? 'exam-mark-active' : ''}`} disabled={remaining === 0} onClick={() => props.onMark(question.id)}><Bookmark />{answer?.marked ? 'علامت‌دار' : 'مرور'}</button>
        {index === ids.length - 1 ? <button className="exam-primary" onClick={props.onReview}><ListChecks />مرور پاسخ‌ها</button> : <button className="exam-primary" disabled={remaining === 0} onClick={() => props.onIndex(index + 1)}>بعدی<ChevronLeft /></button>}
      </footer>
    </section>
  );
}

function SectionTabs({ run, currentQuestionId, onIndex }: { run: QuizRun; currentQuestionId: string; onIndex: (index: number) => void }) {
  const current = run.sections?.find((section) => section.questionIds.includes(currentQuestionId));
  return <nav className="exam-sections" aria-label="دفترچه‌های آزمون">{run.sections?.map((section, sectionIndex) => { const active = section.id === current?.id; const firstIndex = run.quiz.questions.findIndex((question) => section.questionIds.includes(question.id)); const locked = run.navigationMode === 'sequential' && !active; return <button key={section.id} type="button" className={active ? 'is-active' : ''} disabled={locked || firstIndex < 0} aria-current={active ? 'step' : undefined} onClick={() => onIndex(firstIndex)}><span>دفترچه {toPersian(section.order || sectionIndex + 1)}</span><strong>{section.name}</strong>{section.allocatedMinutes ? <small>{toPersian(section.allocatedMinutes)} دقیقه</small> : null}</button>; })}</nav>;
}

function QuestionSheet({ run, answers, current, remaining, onIndex }: { run: QuizRun; answers: Record<string, AttemptAnswer | undefined>; current: number; remaining: number; onIndex: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const ids = run.quiz.questions.map((question) => question.id);
  const summary = attemptSummary(ids, answers);
  return <><button className="mx-auto mb-24 flex min-h-12 items-center gap-2 rounded-2xl border border-ink/15 bg-white px-4 text-sm font-bold" onClick={() => setOpen(true)}><ListChecks size={18} />پاسخ‌برگ · {summary.answered} پاسخ</button>{open ? <div className="sheet-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="answer-sheet-title" className="answer-sheet" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/15" /><div className="flex items-center justify-between"><div><h2 id="answer-sheet-title" className="font-black">پاسخ‌برگ آزمون</h2><p className="mt-1 text-xs text-ink/55">{summary.answered} پاسخ · {summary.unanswered} بی‌پاسخ · {summary.marked} مرور</p></div><span className="timer-chip bg-ink text-white" dir="ltr">{formatSeconds(remaining)}</span></div><div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-8">{ids.map((id, questionIndex) => { const state = questionState(answers[id], current === questionIndex); return <button key={id} className={`question-number question-${state}`} aria-label={`سؤال ${questionIndex + 1}، ${stateLabel(state)}`} onClick={() => { onIndex(questionIndex); setOpen(false); }}><span>{toPersian(questionIndex + 1)}</span><small>{stateIcon(state)}</small></button>; })}</div><button className="exam-secondary mt-5 w-full" onClick={() => setOpen(false)}>بستن پاسخ‌برگ</button></section></div> : null}</>;
}

function SubmissionReview(props: Props & { summary: ReturnType<typeof attemptSummary>; remaining: number }) {
  const [confirmed, setConfirmed] = useState(false);
  return <section className="mx-auto max-w-xl space-y-4 pb-8"><header className="rounded-[1.75rem] bg-ink p-5 text-white"><span className="text-xs text-white/65">پیش از پایان یک بار بررسی کن</span><h1 className="mt-1 text-2xl font-black">مرور پاسخ‌ها</h1><span className="timer-chip mt-4 inline-flex bg-white/10" dir="ltr">{formatSeconds(props.remaining)}</span></header><div className="grid grid-cols-3 gap-2"><Summary label="پاسخ" value={props.summary.answered} tone="success" /><Summary label="بی‌پاسخ" value={props.summary.unanswered} tone="warning" /><Summary label="مرور" value={props.summary.marked} tone="info" /></div>{props.summary.unanswered ? <p className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><TriangleAlert className="size-5 shrink-0" />{props.summary.unanswered} سؤال بدون پاسخ مانده است. بعد از ثبت نهایی امکان ویرایش نداری.</p> : null}{props.error ? <p className="state-error">{props.error}</p> : null}<label className="flex min-h-14 items-center gap-3 rounded-2xl border border-ink/15 bg-white px-4 font-bold"><input type="checkbox" className="size-5 accent-ink" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />ثبت نهایی و قفل پاسخ‌ها را تأیید می‌کنم</label><div className="grid grid-cols-2 gap-3"><button className="exam-secondary" onClick={props.onContinue}>بازگشت به سؤال‌ها</button><button className="exam-primary" disabled={!confirmed || props.busy} onClick={props.onSubmit}>{props.busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}پایان آزمون</button></div></section>;
}

function SaveStatus({ state }: { state: AnswerSaveState }) { const copy = state === 'saved' ? 'ذخیره شد' : state === 'saving' ? 'در حال ذخیره' : state === 'queued' ? 'آفلاین — روی دستگاه' : state === 'failed' ? 'خطا در همگام‌سازی' : 'روی دستگاه ذخیره شد'; return <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/65">{state === 'queued' || state === 'failed' ? <CloudOff size={12} /> : state === 'saving' ? <LoaderCircle size={12} className="animate-spin" /> : <ShieldCheck size={12} />}{copy}</span>; }
function Summary({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`rounded-2xl p-3 text-center summary-${tone}`}><strong className="block text-2xl">{toPersian(value)}</strong><span className="text-xs">{label}</span></div>; }
function formatSeconds(value: number) { const minute = String(Math.floor(value / 60)).padStart(2, '0'); const second = String(value % 60).padStart(2, '0'); return `${minute}:${second}`; }
export function timerWarning(remaining: number, total: number) { if (remaining <= 60) return 'one'; if (remaining <= 300) return 'five'; if (total > 30 * 60 && remaining <= 900) return 'fifteen'; return null; }
function toPersian(value: number) { return new Intl.NumberFormat('fa-IR').format(value); }
function stateLabel(state: ReturnType<typeof questionState>) { return state === 'answered' ? 'پاسخ داده‌شده' : state === 'marked' ? 'علامت برای مرور' : state === 'seen' ? 'دیده‌شده بدون پاسخ' : state === 'current' ? 'سؤال فعلی' : 'بدون پاسخ'; }
function stateIcon(state: ReturnType<typeof questionState>) { return state === 'answered' ? '✓' : state === 'marked' ? '★' : state === 'seen' ? '•' : state === 'current' ? '◉' : '○'; }
