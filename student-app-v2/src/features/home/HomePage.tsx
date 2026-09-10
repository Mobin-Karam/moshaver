import { CalendarClock, Play, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { taskStatus } from '@moshaver/student-core';
import { useStudentStore, useTodaySummary } from '../../services/student-store';
import { Button, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { DateMarker, ProgressCard, QuickActions, ScheduleCard, StudentProfileCard, NotificationCard } from '../../components/student';

export function HomePage() {
  const plan = useStudentStore((state) => state.plan);
  const student = useStudentStore((state) => state.student);
  const status = useStudentStore((state) => state.loadStatus);
  const error = useStudentStore((state) => state.error);
  const load = useStudentStore((state) => state.loadDashboard);
  const start = useStudentStore((state) => state.startTask);
  const access = useStudentStore((state) => state.access);
  const exams = useStudentStore((state) => state.exams);
  const notifications = useStudentStore((state) => state.notifications);
  const learning = useStudentStore((state) => state.progress);
  const { current, next, metrics } = useTodaySummary();
  const completion = metrics.totalTasks ? Math.round(((metrics.doneTasks + metrics.partialTasks) / metrics.totalTasks) * 100) : 0;
  const featured = current || next;
  const now = new Date().toTimeString().slice(0, 5);
  const urgentExam = exams.find((exam) => ['active', 'available', 'upcoming'].includes(exam.delivery?.state || ''));
  const recent = notifications.find((item) => !item.readAt) || notifications[0];

  return <div className="page-stack">
    <StudentProfileCard name={student?.name} grade={student?.grade} major={student?.major} />
    <QuickActions />
    {access?.mode === 'guardian' ? <p className="guardian-note">نمای خانواده فقط خواندنی است؛ ثبت فعالیت با حساب دانش‌آموز انجام می‌شود.</p> : null}
    {status === 'loading' && !plan.tasks.length ? <LoadingState label="در حال دریافت برنامه امروز" /> : null}
    {status === 'error' ? <ErrorState message={error || undefined} onRetry={() => void load()} /> : null}
    <section className="today-section" aria-labelledby="today-title">
      <header className="section-heading"><div><span>آنچه امروز مهم است</span><h2 id="today-title">برنامه امروز</h2></div><DateMarker value={plan.isoDate} /></header>
      {featured ? <div className="next-task"><span className="next-task__label">{current ? 'الان' : 'بعدی'}</span><ScheduleCard task={featured} status={current ? 'active' : 'next'} action={access?.canMutateStudentWork ? <Button onClick={() => void start(featured.id)}><Play size={17} />{current ? 'ادامه مطالعه' : 'شروع فعالیت'}</Button> : undefined} /></div> : status !== 'loading' ? <EmptyState title="برای امروز برنامه‌ای ثبت نشده است" description="اگر مشاور برنامه‌ای منتشر کند، فعالیت بعدی همین‌جا دیده می‌شود." /> : null}
      {plan.tasks.length ? <div className="schedule-list">{plan.tasks.filter((task) => task.id !== featured?.id).slice(0, 3).map((task) => { const value = taskStatus(task, now); return <ScheduleCard key={task.id} task={task} status={value === 'done' ? 'done' : value === 'overdue' || value === 'skipped' ? 'overdue' : 'planned'} />; })}</div> : null}
      {plan.tasks.length > 4 ? <Link className="text-link" to="/plan">مشاهده همه برنامه</Link> : null}
    </section>
    <section className="dashboard-grid" aria-label="مرور وضعیت"><ProgressCard label="پیشرفت امروز" value={completion} detail={`${(metrics.doneTasks + metrics.partialTasks).toLocaleString('fa-IR')} از ${metrics.totalTasks.toLocaleString('fa-IR')} فعالیت`} /><ProgressCard label="پیشرفت یادگیری" value={learning?.percent || 0} detail={learning ? `${learning.completed.toLocaleString('fa-IR')} کار تکمیل شده` : 'پس از ثبت فعالیت نمایش داده می‌شود'} /></section>
    {urgentExam ? <Link to="/exam" className="event-card"><span><CalendarClock /></span><div><small>آزمون مهم بعدی</small><strong>{urgentExam.title}</strong><p>{urgentExam.openAt ? formatDate(urgentExam.openAt) : 'جزئیات در مرکز آزمون'}</p></div></Link> : null}
    {recent ? <section><div className="section-heading"><div><span>تغییرها و پیام‌ها</span><h2>آخرین اعلان</h2></div><Link to="/notifications" className="text-link">همه</Link></div><NotificationCard notification={recent} /></section> : null}
    <p className="student-promise"><TrendingUp size={16} /> همه‌چیز برای پاسخ به یک سؤال چیده شده: قدم بعدی من چیست؟</p>
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
