import { AlertCircle, Bell, BookOpen, CalendarClock, CheckCircle2, Clock3, Play, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { StudentTask } from '@moshaver/student-core';
import { useStudentStore, useTodaySummary } from '../../services/student-store';

export function HomePage() {
  const plan = useStudentStore((state) => state.plan);
  const student = useStudentStore((state) => state.student);
  const loadStatus = useStudentStore((state) => state.loadStatus);
  const error = useStudentStore((state) => state.error);
  const startTask = useStudentStore((state) => state.startTask);
  const activeSession = useStudentStore((state) => state.activeSession);
  const access = useStudentStore((state) => state.access);
  const exams = useStudentStore((state) => state.exams);
  const reviews = useStudentStore((state) => state.reviews);
  const notifications = useStudentStore((state) => state.notifications);
  const learningProgress = useStudentStore((state) => state.progress);
  const { current, next, metrics } = useTodaySummary();
  const progress = metrics.totalTasks ? Math.round(((metrics.doneTasks + metrics.partialTasks) / metrics.totalTasks) * 100) : 0;
  const urgentExam = exams.find((item) => item.delivery?.state === 'active') || exams.find((item) => item.delivery?.state === 'available') || exams.find((item) => item.delivery?.state === 'upcoming');
  const advisorMessage = notifications.find((item) => /chat|message|advisor|پیام/i.test(`${item.type || ''} ${item.title}`));
  const unresolvedIssue = notifications.find((item) => /issue|recovery|retry|مشکل|جبران/i.test(`${item.type || ''} ${item.title}`));
  const planned = plan.tasks.reduce((sum, task) => sum + plannedMinutes(task), 0);
  const remainingStudy = Math.max(0, planned - metrics.actualMinutes);

  return (
    <div className="space-y-4">
      <section className="surface overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-ink/60">{formatDate(plan.isoDate)}</span>
            <h1 className="mt-1 text-2xl font-semibold">سلام {student?.name || 'دانش‌آموز'}</h1>
          </div>
          <span className="grid size-10 place-items-center rounded-md bg-saffron/15 text-saffron">
            <Sparkles size={21} />
          </span>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-ink/60">
            <span>پیشرفت امروز</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-mint" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-saffron/15 text-saffron">
            <Clock3 size={22} />
          </span>
          <div>
            <p className="text-xs text-ink/60">ماموریت فعلی</p>
            <h2 className="text-lg font-semibold">{loadStatus === 'loading' ? 'در حال دریافت برنامه' : current ? taskTitle(current) : 'فعلا کاری نداری'}</h2>
          </div>
        </div>
        {current && access?.canMutateStudentWork ? (
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-white" onClick={() => startTask(current.id)}>
            <Play size={18} />
            {activeSession?.taskId === current.id ? 'ادامه مطالعه' : 'شروع مطالعه'}
          </button>
        ) : null}
      </section>

      {access?.mode === 'guardian' ? <p className="rounded-2xl bg-sky-50 p-3 text-sm leading-6 text-sky-900">نمای خانواده فقط خواندنی است؛ انجام فعالیت و ثبت گزارش فقط با حساب دانش‌آموز انجام می‌شود.</p> : null}

      <div className="grid grid-cols-3 gap-2">
        <div className="metric">
          <span className="text-xs text-ink/60">کارها</span>
          <strong className="block text-lg">{metrics.doneTasks + metrics.partialTasks}/{metrics.totalTasks}</strong>
        </div>
        <div className="metric">
          <span className="text-xs text-ink/60">دقیقه</span>
          <strong className="block text-lg">{metrics.actualMinutes}</strong>
        </div>
        <div className="metric">
          <span className="text-xs text-ink/60">تست</span>
          <strong className="block text-lg">{metrics.actualTests}</strong>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="وضعیت مهم امروز">
        <DashboardItem icon={<CalendarClock />} title="آزمون پیش رو" value={urgentExam?.title || 'آزمون فوری نداری'} detail={urgentExam?.delivery?.state === 'active' ? 'تلاش نیمه‌تمام؛ آماده ادامه' : urgentExam?.openAt ? formatExamDate(urgentExam.openAt) : undefined} />
        <DashboardItem icon={<Clock3 />} title="مطالعه باقی‌مانده" value={`${remainingStudy.toLocaleString('fa-IR')} دقیقه`} detail="بر اساس برنامه و زمان ثبت‌شده امروز" />
        <DashboardItem icon={<RotateCcw />} title="مرورهای سررسید" value={`${reviews.length.toLocaleString('fa-IR')} مورد`} detail={reviews[0]?.title || 'مروری برای امروز ثبت نشده'} />
        <DashboardItem icon={<Bell />} title="پیام اخیر مشاور" value={advisorMessage?.title || 'پیام تازه‌ای نیست'} detail={advisorMessage?.message} />
        <DashboardItem icon={<AlertCircle />} title="موضوع حل‌نشده" value={unresolvedIssue?.title || 'مورد باز نداری'} detail={unresolvedIssue?.message} />
        <DashboardItem icon={<TrendingUp />} title="روند هفتگی" value={learningProgress ? `${learningProgress.percent.toLocaleString('fa-IR')}٪ تکمیل` : 'داده کافی نیست'} detail={learningProgress ? `${learningProgress.completed.toLocaleString('fa-IR')} از ${learningProgress.total.toLocaleString('fa-IR')} فعالیت` : undefined} />
      </section>

      <section className="surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen size={18} />
          <h2 className="font-semibold">{plan.title}</h2>
        </div>
        <div className="space-y-2">
          {plan.tasks.length ? plan.tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-md bg-paper px-3 py-3">
              <div>
                <strong className="block">{taskTitle(task)}</strong>
                <span className="text-xs text-ink/60">{task.start} تا {task.end} · {plannedMinutes(task)} دقیقه</span>
              </div>
              {task.completion ? <CheckCircle2 className="text-mint" size={20} /> : null}
            </div>
          )) : <p className="rounded-md bg-paper px-3 py-3 text-sm text-ink/60">برای امروز برنامه منتشر شده‌ای در backend-v2 نیست.</p>}
        </div>
      </section>

      {next ? <p className="text-sm text-ink/65">بعدی: {taskTitle(next)} در {next.start}</p> : null}
    </div>
  );
}

function DashboardItem({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail?: string }) {
  return <article className="surface flex gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint [&>svg]:size-5">{icon}</span><div className="min-w-0"><h2 className="text-xs text-ink/55">{title}</h2><strong className="mt-1 block text-sm">{value}</strong>{detail ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">{detail}</p> : null}</div></article>;
}

function taskTitle(task: { subject?: string; title?: string }) {
  return [task.subject, task.title].filter(Boolean).join(' - ') || 'فعالیت';
}

function plannedMinutes(task: Pick<StudentTask, 'start' | 'end'>) {
  const [startHour = '0', startMinute = '0'] = task.start.split(':');
  const [endHour = '0', endMinute = '0'] = task.end.split(':');
  return Math.max(0, Number(endHour) * 60 + Number(endMinute) - (Number(startHour) * 60 + Number(startMinute)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
}

function formatExamDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
