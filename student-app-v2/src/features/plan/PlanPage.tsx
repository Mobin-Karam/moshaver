import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Clock3 } from 'lucide-react';
import { planMetrics, type StudentTask } from '@moshaver/student-core';
import { useStudentStore } from '../../services/student-store';

export function PlanPage() {
  const plan = useStudentStore((state) => state.plan);
  const loadPlan = useStudentStore((state) => state.loadPlan);
  const loadStatus = useStudentStore((state) => state.loadStatus);
  const [date, setDate] = useState(plan.isoDate);
  const metrics = planMetrics(plan.tasks);

  function move(days: number) {
    const next = addDays(date, days);
    setDate(next);
    void loadPlan(next);
  }

  function pick(value: string) {
    setDate(value);
    void loadPlan(value);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs text-ink/60">برنامه</span>
          <h1 className="mt-1 text-2xl font-semibold">نمای روزانه</h1>
        </div>
        <span className="grid size-10 place-items-center rounded-md bg-mint/15 text-mint">
          <CalendarDays size={22} />
        </span>
      </div>

      <div className="surface grid grid-cols-[44px_1fr_44px] items-center gap-2 p-2">
        <button className="grid size-10 place-items-center rounded-md bg-paper" onClick={() => move(-1)} aria-label="روز قبل">
          <ChevronRight size={18} />
        </button>
        <input className="h-10 rounded-md border border-black/10 px-3 text-center" type="date" value={date} onChange={(event) => pick(event.target.value)} />
        <button className="grid size-10 place-items-center rounded-md bg-paper" onClick={() => move(1)} aria-label="روز بعد">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="فعالیت" value={`${metrics.doneTasks}/${metrics.totalTasks}`} />
        <Metric label="دقیقه" value={metrics.plannedMinutes} />
        <Metric label="تست" value={metrics.plannedTests} />
      </div>

      <section className="space-y-3">
        {loadStatus === 'loading' ? <article className="surface p-4 text-sm text-ink/60">در حال دریافت برنامه...</article> : null}
        {plan.tasks.length ? plan.tasks.map((task) => <TaskCard key={task.id} task={task} />) : <article className="surface p-4 text-sm text-ink/60">برنامه منتشرشده‌ای برای این روز وجود ندارد.</article>}
      </section>
    </section>
  );
}

function TaskCard({ task }: { task: StudentTask }) {
  return (
    <article className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/60">{taskTypeLabel(task.type)}</span>
            {task.completion ? <CheckCircle2 size={16} className="text-mint" /> : null}
          </div>
          <h2 className="mt-2 font-semibold">{[task.subject, task.title].filter(Boolean).join(' - ') || 'فعالیت'}</h2>
          {task.note ? <p className="mt-1 text-sm text-ink/60">{task.note}</p> : null}
        </div>
        <div className="shrink-0 text-left text-sm text-ink/65" dir="ltr">
          <span className="flex items-center gap-1"><Clock3 size={14} />{task.start} - {task.end}</span>
          <span className="mt-1 block">{task.testCount || 0} tests</span>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="metric"><span className="text-xs text-ink/60">{label}</span><strong className="block text-lg">{value}</strong></div>;
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function taskTypeLabel(type: string) {
  if (type === 'test') return 'تست';
  if (type === 'review') return 'مرور';
  if (type === 'exam') return 'آزمون';
  if (type === 'break') return 'استراحت';
  return 'مطالعه';
}
