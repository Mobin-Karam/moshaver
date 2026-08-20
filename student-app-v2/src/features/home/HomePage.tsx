import { BookOpen, CheckCircle2, Clock3, Play, Sparkles } from 'lucide-react';
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
  const { current, next, metrics } = useTodaySummary();
  const progress = metrics.totalTasks ? Math.round(((metrics.doneTasks + metrics.partialTasks) / metrics.totalTasks) * 100) : 0;

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
        {current ? (
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-white" onClick={() => startTask(current.id)}>
            <Play size={18} />
            {activeSession?.taskId === current.id ? 'ادامه مطالعه' : 'شروع مطالعه'}
          </button>
        ) : null}
      </section>

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
