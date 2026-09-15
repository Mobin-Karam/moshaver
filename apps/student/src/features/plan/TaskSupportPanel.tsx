import { AlertTriangle, LoaderCircle, MessageSquarePlus, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../../services/api-client';

interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
}

interface TaskIssue {
  id: string;
  type: string;
  description: string;
  status: string;
  advisorNote?: string;
  createdAt: string;
}

interface TaskDetail {
  comments: TaskComment[];
  issues: TaskIssue[];
}

type PanelStatus = 'loading' | 'ready' | 'saving' | 'error';

export function TaskSupportPanel({ taskId }: { taskId: string }) {
  const [detail, setDetail] = useState<TaskDetail>({ comments: [], issues: [] });
  const [status, setStatus] = useState<PanelStatus>('loading');
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [issueType, setIssueType] = useState('ابهام در برنامه');
  const [issueDescription, setIssueDescription] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    void apiClient.request<TaskDetail>('GET', `/student/tasks/${encodeURIComponent(taskId)}`)
      .then((value) => {
        if (!active) return;
        setDetail({ comments: value.comments || [], issues: value.issues || [] });
        setStatus('ready');
      })
      .catch((reason) => {
        if (!active) return;
        setError(readableError(reason, 'دریافت پیام‌های فعالیت ناموفق بود.'));
        setStatus('error');
      });
    return () => { active = false; };
  }, [taskId]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = comment.trim();
    if (!text || status === 'saving') return;
    setStatus('saving');
    setError('');
    try {
      const created = await apiClient.request<TaskComment, { text: string }>('POST', `/student/tasks/${encodeURIComponent(taskId)}/comments`, { text });
      setDetail((current) => ({ ...current, comments: [...current.comments, created] }));
      setComment('');
      setStatus('ready');
    } catch (reason) {
      setError(readableError(reason, 'ارسال پیام ناموفق بود.'));
      setStatus('error');
    }
  }

  async function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = issueDescription.trim();
    if (!issueType || status === 'saving') return;
    setStatus('saving');
    setError('');
    try {
      const created = await apiClient.request<TaskIssue, { type: string; description?: string }>('POST', `/student/tasks/${encodeURIComponent(taskId)}/issues`, { type: issueType, description });
      setDetail((current) => ({ ...current, issues: [created, ...current.issues] }));
      setIssueDescription('');
      setStatus('ready');
    } catch (reason) {
      setError(readableError(reason, 'ثبت مشکل ناموفق بود.'));
      setStatus('error');
    }
  }

  return (
    <section className="task-support" aria-labelledby="task-support-title">
      <header>
        <div>
          <h3 id="task-support-title">پیگیری این فعالیت</h3>
          <p>سؤال یا مشکل این فعالیت مستقیماً برای مشاور ارسال می‌شود.</p>
        </div>
        {status === 'loading' ? <LoaderCircle className="spin" aria-label="در حال دریافت" /> : null}
      </header>

      {error ? <p className="task-support__error" role="alert">{error}</p> : null}

      <div className="task-support__history" aria-live="polite">
        {detail.issues.map((issue) => (
          <article className="task-support__issue" key={issue.id}>
            <div><AlertTriangle aria-hidden="true" /><strong>{issue.type}</strong><span>{issueStatus(issue.status)}</span></div>
            {issue.description ? <p>{issue.description}</p> : null}
            {issue.advisorNote ? <blockquote><b>پاسخ مشاور:</b> {issue.advisorNote}</blockquote> : null}
          </article>
        ))}
        {detail.comments.map((item) => <p className="task-support__comment" key={item.id}><MessageSquarePlus aria-hidden="true" />{item.text}</p>)}
        {status !== 'loading' && !detail.comments.length && !detail.issues.length ? <p className="task-support__empty">هنوز پیامی برای این فعالیت ثبت نشده است.</p> : null}
      </div>

      <form className="task-support__comment-form" onSubmit={submitComment}>
        <label htmlFor={`task-comment-${taskId}`}>پیام کوتاه برای مشاور</label>
        <div>
          <input id={`task-comment-${taskId}`} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="مثلاً منبع این تمرین کدام است؟" />
          <button type="submit" disabled={!comment.trim() || status === 'saving'} aria-label="ارسال پیام"><Send aria-hidden="true" /></button>
        </div>
      </form>

      <details className="task-support__report">
        <summary><AlertTriangle aria-hidden="true" /> گزارش مشکل در فعالیت</summary>
        <form onSubmit={submitIssue}>
          <label htmlFor={`task-issue-type-${taskId}`}>نوع مشکل</label>
          <select id={`task-issue-type-${taskId}`} value={issueType} onChange={(event) => setIssueType(event.target.value)}>
            <option>ابهام در برنامه</option>
            <option>زمان نامناسب</option>
            <option>منبع در دسترس نیست</option>
            <option>حجم فعالیت زیاد است</option>
            <option>مشکل دیگر</option>
          </select>
          <label htmlFor={`task-issue-description-${taskId}`}>توضیح</label>
          <textarea id={`task-issue-description-${taskId}`} maxLength={2000} value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} placeholder="توضیح اختیاری برای مشاور" />
          <button type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'در حال ثبت…' : 'ثبت و ارسال برای مشاور'}</button>
        </form>
      </details>
    </section>
  );
}

function issueStatus(status: string) {
  const value = status.toUpperCase();
  if (value === 'RESOLVED') return 'حل‌شده';
  if (value === 'IN_PROGRESS') return 'در حال بررسی';
  if (value === 'CLOSED') return 'بسته‌شده';
  return 'ارسال‌شده';
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
