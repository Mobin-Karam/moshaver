import { BookOpenCheck, CheckCircle2, Clock3, RefreshCw, Send } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../../../services/api-client';

type ProgressStatus = 'unread' | 'read' | 'tested' | 'review' | 'mastered';
type SyllabusItem = {
  id: string;
  subject: string;
  description?: string;
  required: boolean;
  track?: string;
  progress: { status: ProgressStatus; accuracy: number; note?: string; updatedAt: string } | null;
};
type RetryRequest = {
  id: string;
  examId: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  moderatorNote?: string;
  createdAt: string;
};

const progressOptions: Array<{ value: ProgressStatus; label: string }> = [
  { value: 'unread', label: 'شروع نشده' },
  { value: 'read', label: 'مطالعه شد' },
  { value: 'tested', label: 'تست زدم' },
  { value: 'review', label: 'نیاز به مرور' },
  { value: 'mastered', label: 'مسلط هستم' },
];

export function ExamPreparationPanel({ examId, attemptsUsed, allowedAttempts }: { examId: string; attemptsUsed: number; allowedAttempts: number }) {
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [requests, setRequests] = useState<RetryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [items, retryRequests] = await Promise.all([
        apiClient.request<SyllabusItem[]>('GET', `/student/exams/${examId}/syllabus`),
        apiClient.request<RetryRequest[]>('GET', '/student/exam-attempt-requests'),
      ]);
      setSyllabus(items);
      setRequests(retryRequests.filter((item) => item.examId === examId));
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { void load(); }, [load]);

  const latestRequest = requests[0];
  const exhausted = attemptsUsed >= allowedAttempts;

  async function updateProgress(item: SyllabusItem, status: ProgressStatus) {
    setSavingId(item.id);
    setError('');
    try {
      await apiClient.request('PUT', `/syllabus/${item.id}/progress`, {
        status,
        accuracy: item.progress?.accuracy ?? 0,
        note: item.progress?.note ?? '',
      });
      setSyllabus((current) => current.map((row) => row.id === item.id
        ? { ...row, progress: { status, accuracy: row.progress?.accuracy ?? 0, note: row.progress?.note, updatedAt: new Date().toISOString() } }
        : row));
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setSavingId('');
    }
  }

  async function requestRetry(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await apiClient.request<RetryRequest, { message: string }>('POST', `/exams/${examId}/retry-request`, { message: message.trim() });
      setRequests((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setMessage('');
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="surface rounded-3xl p-4" aria-labelledby="exam-preparation-title">
      <div className="flex items-center gap-2">
        <BookOpenCheck className="size-5 text-mint" aria-hidden="true" />
        <h2 id="exam-preparation-title" className="font-black">آمادگی و بودجه آزمون</h2>
        <button type="button" className="mr-auto rounded-xl p-2 text-ink/60" onClick={() => void load()} aria-label="تازه‌سازی آمادگی آزمون" disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {loading ? <p className="mt-3 text-sm text-ink/60" role="status">در حال دریافت بودجه آزمون…</p> : syllabus.length ? (
        <ul className="mt-3 space-y-3">
          {syllabus.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ink/10 bg-white p-3">
              <div className="flex items-start gap-2"><strong>{item.subject}</strong>{item.required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-800">ضروری</span> : null}</div>
              {item.description ? <p className="mt-1 text-sm leading-6 text-ink/65">{item.description}</p> : null}
              <label className="mt-2 block text-sm font-bold" htmlFor={`syllabus-progress-${item.id}`}>وضعیت مطالعه</label>
              <select id={`syllabus-progress-${item.id}`} className="mt-1 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3" value={item.progress?.status ?? 'unread'} disabled={savingId === item.id} onChange={(event) => void updateProgress(item, event.target.value as ProgressStatus)}>
                {progressOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-ink/60">برای این آزمون هنوز بودجه‌ای ثبت نشده است.</p>}

      {latestRequest ? <RetryStatus request={latestRequest} /> : null}
      {exhausted && (!latestRequest || latestRequest.status === 'rejected') ? (
        <form className="mt-4 border-t border-ink/10 pt-4" onSubmit={requestRetry}>
          <h3 className="font-black">درخواست تلاش مجدد</h3>
          <p className="mt-1 text-sm text-ink/65">تلاش‌های مجاز شما تمام شده است. دلیل درخواست را برای مسئول آزمون بنویسید.</p>
          <label className="mt-3 block text-sm font-bold" htmlFor={`retry-message-${examId}`}>توضیح درخواست</label>
          <textarea id={`retry-message-${examId}`} className="mt-1 min-h-24 w-full rounded-2xl border border-ink/15 bg-white p-3" maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} />
          <button className="primary-action mt-3 min-h-12" disabled={submitting} type="submit"><Send className="size-4" aria-hidden="true" />{submitting ? 'در حال ارسال…' : 'ارسال درخواست'}</button>
        </form>
      ) : null}

      {error ? <p className="state-error mt-3" role="alert">{error}</p> : null}
    </article>
  );
}

function RetryStatus({ request }: { request: RetryRequest }) {
  const labels = { pending: 'در انتظار بررسی', approved: 'تلاش مجدد تأیید شد', rejected: 'درخواست رد شد' };
  return <section className="mt-4 rounded-2xl bg-sand/60 p-3" aria-label="وضعیت درخواست تلاش مجدد"><div className="flex items-center gap-2">{request.status === 'pending' ? <Clock3 className="size-5" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}<strong>{labels[request.status]}</strong></div>{request.moderatorNote ? <p className="mt-2 text-sm">یادداشت مسئول: {request.moderatorNote}</p> : null}</section>;
}

function readableError(error: unknown) { return error instanceof Error ? error.message : 'دریافت اطلاعات آمادگی آزمون ناموفق بود.'; }
