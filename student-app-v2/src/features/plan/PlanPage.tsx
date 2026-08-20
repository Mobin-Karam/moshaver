import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, LockKeyhole, Pause, Play, Square, X } from 'lucide-react';
import { planMetrics, taskStatus, type StudentTask, type TaskRuntimeStatus } from '@moshaver/student-core';
import { useStudentStore } from '../../services/student-store';

type UiTaskStatus = TaskRuntimeStatus | 'locked' | 'running' | 'missed';

export function PlanPage() {
  const plan = useStudentStore((state) => state.plan);
  const loadPlan = useStudentStore((state) => state.loadPlan);
  const loadStatus = useStudentStore((state) => state.loadStatus);
  const activeSession = useStudentStore((state) => state.activeSession);
  const startTask = useStudentStore((state) => state.startTask);
  const finishTask = useStudentStore((state) => state.finishTask);
  const cancelFocus = useStudentStore((state) => state.cancelFocus);
  const [date, setDate] = useState(plan.isoDate);
  const [now, setNow] = useState(new Date());
  const [finishTaskId, setFinishTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ actualTests: '', difficulty: 'متوسط', note: '' });
  const metrics = planMetrics(plan.tasks);
  const activeTask = useMemo(() => plan.tasks.find((task) => task.id === activeSession?.taskId) ?? null, [activeSession?.taskId, plan.tasks]);
  const elapsedSeconds = activeSession ? Math.max(0, Math.floor((now.getTime() - new Date(activeSession.startedAt).getTime()) / 1000)) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
        {plan.tasks.length ? plan.tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            nowTime={now.toTimeString().slice(0, 5)}
            running={activeSession?.taskId === task.id}
            onStart={() => startTask(task.id)}
            onFinish={() => {
              setFinishTaskId(task.id);
              setFeedback({ actualTests: String(task.testCount || ''), difficulty: 'متوسط', note: '' });
            }}
          />
        )) : <article className="surface p-4 text-sm text-ink/60">برنامه منتشرشده‌ای برای این روز وجود ندارد.</article>}
      </section>

      {activeTask ? (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-3xl rounded-md border border-black/10 bg-ink p-3 text-white shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs text-white/60">حالت مطالعه</span>
              <strong className="block truncate">{taskTitle(activeTask)}</strong>
              <span className="text-xs text-white/70" dir="ltr">{formatElapsed(elapsedSeconds)}</span>
            </div>
            <div className="flex gap-2">
              <button className="grid size-10 place-items-center rounded-md bg-white/10" onClick={() => cancelFocus()} aria-label="توقف"><Pause size={18} /></button>
              <button className="grid size-10 place-items-center rounded-md bg-mint text-white" onClick={() => {
                setFinishTaskId(activeTask.id);
                setFeedback({ actualTests: String(activeTask.testCount || ''), difficulty: 'متوسط', note: '' });
              }} aria-label="پایان"><Square size={18} /></button>
            </div>
          </div>
        </div>
      ) : null}

      {finishTaskId ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/35 p-4">
          <form
            className="surface w-full max-w-3xl space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void finishTask(finishTaskId, { actualTests: Number(feedback.actualTests || 0), difficulty: feedback.difficulty, note: feedback.note }).then(() => setFinishTaskId(null));
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">مطالعه کامل شد؟</h2>
              <button type="button" className="grid size-9 place-items-center rounded-md bg-paper" onClick={() => setFinishTaskId(null)} aria-label="بستن"><X size={18} /></button>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-ink/65">تعداد تست</span>
              <input className="h-11 w-full rounded-md border border-black/10 px-3" inputMode="numeric" value={feedback.actualTests} onChange={(event) => setFeedback((current) => ({ ...current, actualTests: event.target.value }))} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-ink/65">درجه سختی</span>
              <select className="h-11 w-full rounded-md border border-black/10 px-3" value={feedback.difficulty} onChange={(event) => setFeedback((current) => ({ ...current, difficulty: event.target.value }))}>
                <option>آسان</option>
                <option>متوسط</option>
                <option>سخت</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-ink/65">یادداشت</span>
              <textarea className="min-h-24 w-full rounded-md border border-black/10 px-3 py-2" value={feedback.note} onChange={(event) => setFeedback((current) => ({ ...current, note: event.target.value }))} />
            </label>
            <button className="w-full rounded-md bg-ink px-4 py-3 text-white">ثبت پایان مطالعه</button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function TaskCard({ task, index, nowTime, running, onStart, onFinish }: { task: StudentTask; index: number; nowTime: string; running: boolean; onStart: () => void; onFinish: () => void }) {
  const status = running ? 'running' : statusForTask(task, nowTime, index);
  return (
    <article className={`surface relative overflow-hidden p-4 ${status === 'locked' ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-[56px_1fr] gap-3">
        <div className="flex flex-col items-center">
          <span className={`grid size-11 place-items-center rounded-md ${statusClass(status)}`}>
            {statusIcon(status)}
          </span>
          <span className="mt-2 text-xs text-ink/50" dir="ltr">{task.start}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/60">{taskTypeLabel(task.type)}</span>
            <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/60">{statusLabel(status)}</span>
          </div>
          <h2 className="mt-2 font-semibold">{taskTitle(task)}</h2>
          {task.note ? <p className="mt-1 text-sm text-ink/60">{task.note}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/60">
            <span className="rounded-md bg-paper px-2 py-1" dir="ltr">{task.start} - {task.end}</span>
            <span className="rounded-md bg-paper px-2 py-1">{plannedMinutes(task)} دقیقه</span>
            {task.pages ? <span className="rounded-md bg-paper px-2 py-1">{task.pages}</span> : null}
            <span className="rounded-md bg-paper px-2 py-1">{task.testCount || 0} تست</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-md bg-paper px-3 py-2 text-sm disabled:opacity-50" disabled={status === 'locked' || status === 'done'} onClick={onStart}><Play size={15} className="inline" /> شروع</button>
            <button className="rounded-md bg-ink px-3 py-2 text-sm text-white disabled:opacity-50" disabled={status === 'locked' || status === 'done'} onClick={onFinish}>اتمام</button>
          </div>
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

function statusForTask(task: StudentTask, nowTime: string, index: number): UiTaskStatus {
  const status = taskStatus(task, nowTime);
  if (status === 'next') {
    const previousRequired = index > 0 && !task.completion && task.start > nowTime;
    return previousRequired ? 'locked' : 'next';
  }
  if (status === 'overdue') return 'missed';
  return status;
}

function statusLabel(status: string) {
  if (status === 'locked') return 'قفل';
  if (status === 'running') return 'در حال اجرا';
  if (status === 'done') return 'انجام شد';
  if (status === 'partial') return 'نیمه‌کامل';
  if (status === 'missed' || status === 'skipped') return 'از دست رفته';
  if (status === 'current') return 'آماده';
  return 'بعدی';
}

function statusClass(status: string) {
  if (status === 'done') return 'bg-mint/15 text-mint';
  if (status === 'running' || status === 'current') return 'bg-ink text-white';
  if (status === 'missed' || status === 'skipped') return 'bg-red-50 text-red-700';
  if (status === 'locked') return 'bg-slate-100 text-slate-400';
  return 'bg-saffron/15 text-saffron';
}

function statusIcon(status: string) {
  if (status === 'done') return <CheckCircle2 size={20} />;
  if (status === 'running' || status === 'current') return <Play size={19} />;
  if (status === 'locked') return <LockKeyhole size={18} />;
  if (status === 'missed' || status === 'skipped') return <X size={18} />;
  return <BookOpen size={19} />;
}

function taskTitle(task: { subject?: string; title?: string }) {
  return [task.subject, task.title].filter(Boolean).join(' - ') || 'فعالیت';
}

function plannedMinutes(task: Pick<StudentTask, 'start' | 'end'>) {
  const [startHour = '0', startMinute = '0'] = task.start.split(':');
  const [endHour = '0', endMinute = '0'] = task.end.split(':');
  return Math.max(0, Number(endHour) * 60 + Number(endMinute) - (Number(startHour) * 60 + Number(startMinute)));
}

function formatElapsed(seconds: number) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}
