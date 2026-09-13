import { CalendarClock, CheckCircle2, ChevronLeft, Clock3, GraduationCap, Play } from 'lucide-react';
import { examAvailability, type ExamSummary } from '@moshaver/student-core';
import { useMemo, useState } from 'react';

type Props = { exams: ExamSummary[]; busy: boolean; error: string; onOpen: (exam: ExamSummary) => void };
type Filter = 'all' | 'now' | 'upcoming' | 'results' | 'action';

export function ExamCenter({ exams, busy, error, onOpen }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const grouped = useMemo(() => { const now = new Date(); return { now: exams.filter((exam) => ['available', 'active'].includes(examAvailability(exam, now).state)), upcoming: exams.filter((exam) => examAvailability(exam, now).state === 'upcoming'), results: exams.filter((exam) => ['submitted', 'released'].includes(exam.delivery?.state || '')), action: exams.filter((exam) => ['withheld', 'calculating'].includes(exam.delivery?.state || '')) }; }, [exams]);
  const active = grouped.now.find((exam) => examAvailability(exam, new Date()).state === 'active');
  const visible = filter === 'all' ? exams : grouped[filter];
  return <section className="exam-center" aria-labelledby="exam-center-title">
    <div className="exam-center__title"><span><GraduationCap /></span><div><h1 id="exam-center-title">آزمون‌ها</h1><small>{toPersian(exams.length)} آزمون برای تو</small></div></div>
    {active ? <button className="exam-resume" onClick={() => onOpen(active)} disabled={busy}><span><small>در حال اجرا</small><strong>{active.title}</strong><em>{toPersian(active.delivery?.questionCount || 0)} سؤال · {toPersian(active.durationMinutes || 0)} دقیقه</em></span><i><Play fill="currentColor" /></i></button> : null}
    <div className="exam-stats" aria-label="خلاصه آزمون‌ها"><Stat label="آماده" value={grouped.now.length} /><Stat label="پیش رو" value={grouped.upcoming.length} /><Stat label="نتیجه" value={grouped.results.length} /></div>
    <div className="exam-filters" role="group" aria-label="فیلتر آزمون‌ها">{([['all', 'همه'], ['now', 'اکنون'], ['upcoming', 'پیش رو'], ['results', 'نتایج'], ['action', 'پیگیری']] as const).map(([key, label]) => <button key={key} className={filter === key ? 'is-active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {error ? <p className="state-error" role="alert">{error}</p> : null}
    <div className="exam-list">{visible.length ? visible.map((exam) => <ExamRow key={exam.id} exam={exam} busy={busy} onOpen={onOpen} />) : <div className="exam-empty"><CheckCircle2 /><strong>موردی در این بخش نیست</strong><span>فیلتر دیگری را انتخاب کن.</span></div>}</div>
    {filter === 'results' && grouped.results.length ? <ResultTrend exams={grouped.results} /> : null}
  </section>;
}

function ExamRow({ exam, busy, onOpen }: { exam: ExamSummary; busy: boolean; onOpen: (exam: ExamSummary) => void }) {
  const availability = examAvailability(exam, new Date()); const resultState = ['released', 'withheld', 'calculating', 'submitted'].includes(exam.delivery?.state || '');
  const status = availability.state === 'active' ? 'در حال اجرا' : availability.state === 'available' ? 'آماده شروع' : availability.state === 'upcoming' ? 'پیش رو' : exam.delivery?.state === 'released' ? 'نتیجه آماده' : 'پایان‌یافته';
  const icon = availability.state === 'upcoming' ? <CalendarClock /> : resultState ? <CheckCircle2 /> : availability.state === 'active' ? <Play /> : <Clock3 />;
  return <button className={`exam-row exam-row--${availability.state}`} disabled={busy} onClick={() => onOpen(exam)}><span className="exam-row__icon">{icon}</span><span className="exam-row__body"><span><em>{status}</em>{exam.mode === 'konkur' ? <i>دفترچه‌ای</i> : null}</span><strong>{exam.title}</strong><small>{exam.subjects?.join('، ') || 'چند درس'} · {toPersian(exam.delivery?.questionCount || 0)} سؤال · {toPersian(exam.durationMinutes || 0)} دقیقه</small>{availability.state === 'upcoming' && exam.openAt ? <small>شروع {formatDate(exam.openAt)}</small> : null}</span><span className="exam-row__end">{exam.delivery?.state === 'released' && typeof exam.delivery.lastAttempt?.score === 'number' ? <b>{toPersian(exam.delivery.lastAttempt.score)}٪</b> : <ChevronLeft />}</span></button>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div><strong>{toPersian(value)}</strong><span>{label}</span></div>; }
function ResultTrend({ exams }: { exams: ExamSummary[] }) { const released = exams.filter((exam) => typeof exam.delivery?.lastAttempt?.score === 'number').slice(0, 6); if (!released.length) return null; return <section className="exam-trend"><h2>روند نتیجه‌ها</h2><div role="img" aria-label={released.map((exam) => `${exam.title}: ${exam.delivery?.lastAttempt?.score} درصد`).join('، ')}>{released.map((exam) => { const score = exam.delivery?.lastAttempt?.score || 0; return <span key={exam.id}><b>{toPersian(score)}٪</b><i style={{ blockSize: `${Math.max(5, score)}%` }} /><small>{exam.subjects?.[0] || 'آزمون'}</small></span>; })}</div></section>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function toPersian(value: number) { return new Intl.NumberFormat('fa-IR').format(value); }
