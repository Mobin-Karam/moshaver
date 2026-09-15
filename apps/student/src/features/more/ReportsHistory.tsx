import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api-client';

interface DailyReport { id: string; planDate: string; focus: number; fatigue: number; motivation: number; problem?: string; }
interface RecoveryRequest { id: string; planDate: string; reason: string; note?: string; status: 'pending' | 'resolved' | 'dismissed'; createdAt: string; }

export function ReportsHistory({ revision = 0 }: { revision?: number }) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    void Promise.all([
      apiClient.request<DailyReport[]>('GET', '/reports?limit=10'),
      apiClient.request<RecoveryRequest[]>('GET', '/recovery-requests'),
    ]).then(([nextReports, nextRequests]) => {
      if (!active) return;
      setReports(nextReports);
      setRequests(nextRequests);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [revision]);

  return <section className="reports-history" aria-labelledby="reports-history-title">
    <header><FileText aria-hidden="true" /><span><strong id="reports-history-title">سوابق ارسال‌شده</strong><small>گزارش‌های اخیر و وضعیت درخواست‌های جبران</small></span></header>
    {status === 'loading' ? <p className="settings-empty" role="status">در حال دریافت سوابق…</p> : null}
    {status === 'error' ? <p className="guardian-selection-error" role="alert">دریافت سوابق انجام نشد.</p> : null}
    {status === 'ready' && !reports.length && !requests.length ? <p className="settings-empty">هنوز گزارشی ارسال نشده است.</p> : null}
    {requests.length ? <div className="reports-history__list"><h3>درخواست‌های جبران</h3>{requests.map((request) => <article key={request.id}><span className={`is-${request.status}`}>{requestStatusIcon(request.status)}</span><div><strong>{request.reason || 'درخواست جبران برنامه'}</strong><small>{formatDate(request.planDate)} · {requestStatusLabel(request.status)}</small>{request.note ? <p>{request.note}</p> : null}</div></article>)}</div> : null}
    {reports.length ? <div className="reports-history__list"><h3>گزارش‌های شبانه</h3>{reports.map((report) => <article key={report.id}><span><FileText aria-hidden="true" /></span><div><strong>{formatDate(report.planDate)}</strong><small>تمرکز {fa(report.focus)} · انگیزه {fa(report.motivation)} · خستگی {fa(report.fatigue)}</small>{report.problem ? <p>{report.problem}</p> : null}</div></article>)}</div> : null}
  </section>;
}

function requestStatusIcon(status: RecoveryRequest['status']) { if (status === 'resolved') return <CheckCircle2 aria-hidden="true" />; if (status === 'dismissed') return <XCircle aria-hidden="true" />; return <Clock3 aria-hidden="true" />; }
function requestStatusLabel(status: RecoveryRequest['status']) { if (status === 'resolved') return 'رسیدگی و حل شد'; if (status === 'dismissed') return 'بسته شد'; return 'در انتظار بررسی مشاور'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)); }
function fa(value: number) { return Number(value || 0).toLocaleString('fa-IR'); }
