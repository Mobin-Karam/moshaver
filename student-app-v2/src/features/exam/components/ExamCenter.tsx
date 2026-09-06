import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, PlayCircle } from 'lucide-react';
import { examAvailability, type ExamSummary } from '@moshaver/student-core';

type Props = {
  exams: ExamSummary[];
  busy: boolean;
  error: string;
  onOpen: (exam: ExamSummary) => void;
};

export function ExamCenter({ exams, busy, error, onOpen }: Props) {
  const now = new Date();
  const grouped = {
    now: exams.filter((exam) => ['available', 'active'].includes(examAvailability(exam, now).state)),
    upcoming: exams.filter((exam) => examAvailability(exam, now).state === 'upcoming'),
    results: exams.filter((exam) => ['submitted', 'released'].includes(exam.delivery?.state || '')),
    action: exams.filter((exam) => ['withheld', 'calculating'].includes(exam.delivery?.state || '')),
  };

  return (
    <section className="space-y-6" aria-labelledby="exam-center-title">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-ink to-[#35546c] p-5 text-white shadow-lg shadow-ink/10">
        <span className="text-xs text-white/70">مرکز ارزیابی</span>
        <h1 id="exam-center-title" className="mt-1 text-2xl font-black">
          آزمون‌های من
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
          زمان‌بندی، ادامه تلاش و نتیجه‌های منتشرشده را از یک جا دنبال کن.
        </p>
      </header>

      {error ? <p className="state-error" role="alert">{error}</p> : null}

      <ExamGroup title="اکنون" icon={<PlayCircle />} empty="آزمون آماده یا نیمه‌تمامی نداری.">
        {grouped.now.map((exam) => <ExamCard key={exam.id} exam={exam} busy={busy} onOpen={onOpen} />)}
      </ExamGroup>
      <ExamGroup title="پیش رو" icon={<CalendarClock />} empty="آزمون زمان‌بندی‌شده‌ای ثبت نشده است.">
        {grouped.upcoming.map((exam) => <ExamCard key={exam.id} exam={exam} busy={busy} onOpen={onOpen} />)}
      </ExamGroup>
      <ExamGroup title="نتایج" icon={<CheckCircle2 />} empty="هنوز نتیجه منتشرشده‌ای نداری.">
        {grouped.results.map((exam) => <ExamCard key={exam.id} exam={exam} busy={busy} onOpen={onOpen} />)}
      </ExamGroup>
      {grouped.results.length ? <ResultTrend exams={grouped.results} /> : null}
      <ExamGroup title="نیازمند اقدام" icon={<AlertTriangle />} empty="مورد نیازمند اقدامی وجود ندارد.">
        {grouped.action.map((exam) => <ExamCard key={exam.id} exam={exam} busy={busy} onOpen={onOpen} />)}
      </ExamGroup>
    </section>
  );
}

function ResultTrend({ exams }: { exams: ExamSummary[] }) {
  const released = exams.filter((exam) => typeof exam.delivery?.lastAttempt?.score === 'number').slice(0, 6);
  if (!released.length) return null;
  return <section className="surface rounded-3xl p-4" aria-labelledby="exam-trend-title"><h2 id="exam-trend-title" className="font-black">روند نتیجه‌های اخیر</h2><p className="mt-1 text-xs text-ink/55">فقط بر پایه نتیجه‌های منتشرشده واقعی</p><div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label={released.map((exam) => `${exam.title}: ${exam.delivery?.lastAttempt?.score} درصد`).join('، ')}>{released.map((exam) => { const score = exam.delivery?.lastAttempt?.score || 0; return <div key={exam.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-bold">{new Intl.NumberFormat('fa-IR').format(score)}٪</span><span className="w-full rounded-t-lg bg-mint" style={{ height: `${Math.max(4, score)}%` }} /><span className="w-full truncate text-center text-[9px] text-ink/55">{exam.subjects?.[0] || 'آزمون'}</span></div>; })}</div></section>;
}

function ExamGroup({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode[] }) {
  const hasChildren = children.length > 0;
  return (
    <section aria-labelledby={`exam-group-${title}`}>
      <div className="mb-3 flex items-center gap-2 text-ink/75">
        <span className="[&>svg]:size-5" aria-hidden="true">{icon}</span>
        <h2 id={`exam-group-${title}`} className="font-black">{title}</h2>
      </div>
      <div className="space-y-3">
        {hasChildren ? children : <p className="rounded-2xl border border-dashed border-ink/15 px-4 py-5 text-sm text-ink/55">{empty}</p>}
      </div>
    </section>
  );
}

function ExamCard({ exam, busy, onOpen }: { exam: ExamSummary; busy: boolean; onOpen: (exam: ExamSummary) => void }) {
  const availability = examAvailability(exam, new Date());
  const active = availability.state === 'active';
  const resultState = ['released', 'withheld', 'calculating', 'submitted'].includes(exam.delivery?.state || '');
  const actionable = availability.canStart || resultState;
  return (
    <article className="surface rounded-3xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black leading-7">{exam.title}</h3>
            <span className="status-pill">{exam.mode === 'konkur' ? 'دفترچه‌ای' : 'استاندارد'}</span>
          </div>
          <p className="mt-1 text-xs text-ink/55">{exam.subjects?.join('، ') || 'چند درس'}</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-saffron/15 text-saffron"><Clock3 size={21} /></span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Meta label="مدت" value={`${exam.durationMinutes || 0} دقیقه`} />
        <Meta label="سؤال" value={String(exam.delivery?.questionCount || 0)} />
        <Meta label="تلاش" value={`${exam.delivery?.attemptsUsed || 0}/${exam.delivery?.allowedAttempts || exam.maxAttempts || 1}`} />
      </dl>
      <div className="mt-4 space-y-1 text-xs leading-6 text-ink/60">
        {exam.openAt ? <p>شروع دسترسی: {formatDate(exam.openAt)}</p> : null}
        {exam.closeAt ? <p>پایان دسترسی: {formatDate(exam.closeAt)}</p> : null}
      </div>
      {exam.delivery?.reason ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{exam.delivery.reason}</p> : null}
      <button className="primary-action mt-4" disabled={busy || !actionable} onClick={() => onOpen(exam)}>
        {active ? 'ادامه آزمون' : resultState ? 'مشاهده وضعیت نتیجه' : availability.state === 'upcoming' ? 'هنوز باز نشده' : 'آمادگی و شروع'}
      </button>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-paper px-2 py-2"><dt className="text-ink/50">{label}</dt><dd className="mt-1 font-bold text-ink">{value}</dd></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
