import { CalendarClock, Eye, ShieldCheck } from 'lucide-react';
import type { ExamSummary } from '@moshaver/student-core';

export function GuardianExamView({ exams }: { exams: ExamSummary[] }) {
  return (
    <section className="space-y-4" aria-labelledby="guardian-exams-title">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-[#3d5266] to-ink p-5 text-white">
        <span className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck size={15} />نمای خانواده · فقط خواندنی</span>
        <h1 id="guardian-exams-title" className="mt-2 text-2xl font-black">آزمون‌های فرزند</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">زمان‌بندی، وضعیت حضور و نتیجه‌هایی که برگزارکننده منتشر کرده است.</p>
      </header>
      {exams.length ? exams.map((exam) => (
        <article key={exam.id} className="surface rounded-3xl p-4">
          <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-saffron/15 text-saffron"><CalendarClock /></span><div><h2 className="font-black">{exam.title}</h2><p className="mt-1 text-xs text-ink/55">{exam.subjects?.join('، ') || 'آزمون آموزشی'} · {exam.durationMinutes || 0} دقیقه</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><p className="rounded-2xl bg-paper p-3">وضعیت: <strong>{stateLabel(exam.delivery?.state)}</strong></p><p className="rounded-2xl bg-paper p-3">تلاش: <strong>{exam.delivery?.attemptsUsed || 0}</strong></p></div>
          {exam.openAt ? <p className="mt-3 text-xs text-ink/60">زمان برگزاری: {formatDate(exam.openAt)}</p> : null}
          {exam.delivery?.state === 'released' ? <p className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900"><Eye size={17} />نتیجه منتشرشده برای خانواده قابل مشاهده است.</p> : null}
          {exam.delivery?.lastAttempt?.subjectSummary?.length ? <div className="mt-3 grid gap-2">{exam.delivery.lastAttempt.subjectSummary.map((item) => <div key={item.subject} className="flex items-center justify-between rounded-2xl bg-paper px-3 py-2 text-sm"><span>{item.subject}</span><strong>{new Intl.NumberFormat('fa-IR').format(item.percentage)}٪</strong></div>)}</div> : null}
        </article>
      )) : <p className="rounded-3xl border border-dashed border-ink/15 p-5 text-sm text-ink/55">آزمونی برای فرزند انتخاب‌شده ثبت نشده است.</p>}
    </section>
  );
}

function stateLabel(state?: string) { if (state === 'released') return 'نتیجه منتشرشده'; if (state === 'active') return 'در حال برگزاری'; if (state === 'upcoming') return 'پیش رو'; if (state === 'withheld') return 'نتیجه منتشر نشده'; if (state === 'calculating') return 'در حال محاسبه'; return 'پایان‌یافته'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
