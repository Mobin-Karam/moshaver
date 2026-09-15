import { BarChart3, Heart, Send, TrendingUp } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../../services/api-client';
import { useStudentStore } from '../../services/student-store';

interface GuardianProgress { completed?: number; total?: number; percent?: number; weekly?: { completedTasks?: number; totalTasks?: number; completionPercent?: number; studyMinutes?: number }; }
interface GuardianReport { id: string; planDate: string; focus: number; fatigue: number; motivation: number; problem?: string; }

export function GuardianInsightsPage() {
  const studentId = useStudentStore((state) => state.selectedGuardianStudentId);
  const student = useStudentStore((state) => state.student);
  const [progress, setProgress] = useState<GuardianProgress | null>(null);
  const [reports, setReports] = useState<GuardianReport[]>([]);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState('PROUD');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'sent' | 'error'>('loading');

  useEffect(() => {
    if (!studentId) { setStatus('ready'); return; }
    let active = true;
    setStatus('loading');
    void Promise.all([
      apiClient.request<GuardianProgress>('GET', `/guardian/students/${encodeURIComponent(studentId)}/progress`),
      apiClient.request<GuardianReport[]>('GET', `/guardian/students/${encodeURIComponent(studentId)}/reports`),
    ]).then(([nextProgress, nextReports]) => {
      if (!active) return;
      setProgress(nextProgress); setReports(nextReports); setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [studentId]);

  async function encourage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = message.trim();
    if (!studentId || !value || status === 'saving') return;
    setStatus('saving');
    try {
      await apiClient.request('POST', `/guardian/students/${encodeURIComponent(studentId)}/encouragement`, { message: value, kind });
      setMessage(''); setStatus('sent');
    } catch { setStatus('error'); }
  }

  if (!studentId) return <p className="settings-empty">ابتدا دانش‌آموز را از بالای برنامه انتخاب کنید.</p>;
  const completed = progress?.weekly?.completedTasks ?? progress?.completed ?? 0;
  const total = progress?.weekly?.totalTasks ?? progress?.total ?? 0;
  const percent = progress?.weekly?.completionPercent ?? progress?.percent ?? (total ? Math.round((completed / total) * 100) : 0);

  return <div className="guardian-insights">
    <section className="guardian-progress-card"><header><TrendingUp aria-hidden="true" /><span><strong>پیشرفت {student?.name || 'دانش‌آموز'}</strong><small>نمای خانوادگی و فقط‌خواندنی</small></span></header>{status === 'loading' ? <p className="settings-empty" role="status">در حال دریافت اطلاعات…</p> : <div className="guardian-progress-card__metrics"><div><strong>{Number(percent).toLocaleString('fa-IR')}٪</strong><span>تکمیل برنامه</span></div><div><strong>{Number(completed).toLocaleString('fa-IR')} / {Number(total).toLocaleString('fa-IR')}</strong><span>فعالیت انجام‌شده</span></div><div><strong>{Number(progress?.weekly?.studyMinutes || 0).toLocaleString('fa-IR')}</strong><span>دقیقه مطالعه</span></div></div>}</section>
    <section className="guardian-encouragement"><header><Heart aria-hidden="true" /><span><strong>ارسال دلگرمی</strong><small>پیام شما به‌صورت اعلان برای دانش‌آموز ارسال می‌شود.</small></span></header><form onSubmit={encourage}><label htmlFor="encouragement-kind">نوع پیام</label><select id="encouragement-kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="PROUD">بهت افتخار می‌کنم</option><option value="SUPPORT">کنارت هستم</option><option value="KEEP_GOING">ادامه بده</option><option value="CELEBRATE">آفرین و تبریک</option></select><label htmlFor="encouragement-message">متن دلگرمی</label><div><input id="encouragement-message" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="یک پیام کوتاه و مثبت…" /><button type="submit" disabled={!message.trim() || status === 'saving'} aria-label="ارسال دلگرمی"><Send aria-hidden="true" /></button></div></form>{status === 'sent' ? <p className="guardian-encouragement__success" role="status">دلگرمی شما ارسال شد.</p> : null}{status === 'error' ? <p className="guardian-selection-error" role="alert">دریافت اطلاعات یا ارسال دلگرمی ناموفق بود.</p> : null}</section>
    <section className="guardian-report-list"><header><BarChart3 aria-hidden="true" /><strong>گزارش‌های شبانه اخیر</strong></header>{reports.map((report) => <article key={report.id}><strong>{formatDate(report.planDate)}</strong><small>تمرکز {fa(report.focus)} · انگیزه {fa(report.motivation)} · خستگی {fa(report.fatigue)}</small>{report.problem ? <p>{report.problem}</p> : null}</article>)}{status !== 'loading' && !reports.length ? <p className="settings-empty">هنوز گزارش شبانه‌ای ثبت نشده است.</p> : null}</section>
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)); }
function fa(value: number) { return Number(value || 0).toLocaleString('fa-IR'); }
