import type { ReactNode } from 'react';
import { Bell, BookOpen, CalendarDays, CheckCircle2, Clock3, GraduationCap, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StudentTask, ExamSummary } from '@moshaver/student-core';
import type { StudentNotification } from '../../services/student-store';
import { Badge, Card } from '../ui';

export function StudentProfileCard({ name, grade, major }: { name?: string; grade?: string; major?: string }) {
  return <Card className="profile-card"><span className="profile-card__avatar"><UserRound /></span><div><span>دانش‌آموز</span><h2>{name || 'دانش‌آموز مشاور'}</h2><p>{[grade, major].filter(Boolean).join(' · ') || 'پرونده آموزشی'}</p></div><Link to="/more" aria-label="مشاهده پروفایل"><UserRound size={20} /></Link></Card>;
}

export function QuickActions() {
  const actions = [{ to: '/plan', label: 'برنامه', icon: <CalendarDays /> }, { to: '/exam', label: 'آزمون‌ها', icon: <GraduationCap /> }, { to: '/learning', label: 'گزارش', icon: <BookOpen /> }, { to: '/notifications', label: 'اعلان‌ها', icon: <Bell /> }];
  return <nav className="quick-actions" aria-label="دسترسی سریع">{actions.map((item) => <Link key={item.to} to={item.to}><span>{item.icon}</span><em>{item.label}</em></Link>)}</nav>;
}

export function DateMarker({ value }: { value: string }) {
  const date = new Date(`${value}T12:00:00`); const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(date); const day = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(date); const month = new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(date);
  return <div className="date-marker"><span>{weekday}</span><strong>{day}</strong><span>{month}</span></div>;
}

export function ScheduleCard({ task, status = 'planned', action }: { task: StudentTask; status?: 'planned' | 'next' | 'active' | 'done' | 'overdue'; action?: ReactNode }) {
  const tone = status === 'done' ? 'success' : status === 'overdue' ? 'danger' : status === 'active' || status === 'next' ? 'primary' : 'neutral';
  return <Card className={`schedule-card schedule-card--${status}`}><div className="schedule-card__time"><strong dir="ltr">{task.start}</strong><span dir="ltr">{task.end}</span></div><div className="schedule-card__body"><div><Badge tone={tone}>{statusLabel(status)}</Badge></div><h3>{[task.subject, task.title].filter(Boolean).join(' · ') || 'فعالیت مطالعاتی'}</h3><p>{task.note || `${minutes(task).toLocaleString('fa-IR')} دقیقه${task.testCount ? ` · ${task.testCount.toLocaleString('fa-IR')} تست` : ''}`}</p>{action ? <div className="schedule-card__action">{action}</div> : null}</div></Card>;
}

export function ExamCard({ exam, status, action }: { exam: ExamSummary; status: string; action?: ReactNode }) {
  return <Card className="student-exam-card"><div className="student-exam-card__icon"><GraduationCap /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3>{exam.title}</h3><Badge tone="info">{status}</Badge></div><p>{exam.subjects?.join('، ') || 'چند درس'}</p><dl><Meta label="مدت" value={`${exam.durationMinutes || 0} دقیقه`} /><Meta label="سؤال" value={String(exam.delivery?.questionCount || 0)} /><Meta label="تلاش" value={`${exam.delivery?.attemptsUsed || 0}/${exam.delivery?.allowedAttempts || exam.maxAttempts || 1}`} /></dl>{action}</div></Card>;
}

export function NotificationCard({ notification, onRead }: { notification: StudentNotification; onRead?: () => void }) {
  const unread = !notification.readAt;
  return <button type="button" className={`notification-card ${unread ? 'is-unread' : ''}`} onClick={onRead} aria-label={`${notification.title}${unread ? '، خوانده‌نشده' : ''}`}><span className="notification-card__icon"><Bell /></span><span><strong>{notification.title}</strong><p>{notification.message}</p></span>{unread ? <i aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}</button>;
}

export function ProgressCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <Card className="progress-card"><div><span>{label}</span><strong>{value.toLocaleString('fa-IR')}٪</strong></div><div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ inlineSize: `${Math.min(100, Math.max(0, value))}%` }} /></div><p>{detail}</p></Card>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function statusLabel(status: string) { return status === 'done' ? 'انجام شده' : status === 'overdue' ? 'عقب افتاده' : status === 'active' ? 'در حال انجام' : status === 'next' ? 'بعدی' : 'برنامه‌ریزی شده'; }
function minutes(task: StudentTask) { const [sh, sm] = task.start.split(':').map(Number); const [eh, em] = task.end.split(':').map(Number); return Math.max(0, eh * 60 + em - sh * 60 - sm); }
