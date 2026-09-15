import { ArrowUpLeft, ExternalLink, Link2, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/api-client';
import { useStudentStore } from '../../services/student-store';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';

type LearningResource = {
  id: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  updatedAt?: string;
};

export function LearningResourcesPage() {
  const access = useStudentStore((state) => state.access);
  const childId = useStudentStore((state) => state.selectedGuardianStudentId);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (access?.mode === 'guardian' && !childId) {
      setResources([]);
      setStatus('ready');
      return () => { active = false; };
    }
    setStatus('loading');
    const query = access?.mode === 'guardian' && childId
      ? `?studentId=${encodeURIComponent(childId)}`
      : '';
    void apiClient.request<LearningResource[]>('GET', `/learning-resources/assigned${query}`)
      .then((items) => {
        if (!active) return;
        setResources(items);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [access?.mode, childId, revision]);

  return <section className="resource-library">
    <header className="resource-library__header">
      <div><small>کتابخانه من</small><h1>منابع آموزشی</h1><p>{access?.mode === 'guardian' ? 'محتوای منتشرشده برای فرزند انتخاب‌شده' : 'محتوای انتخاب‌شده توسط تیم آموزشی برای شما'}</p></div>
      <Link to="/more" aria-label="بازگشت به بیشتر"><ArrowUpLeft /></Link>
    </header>
    {status === 'loading' ? <LoadingState label="در حال دریافت منابع آموزشی" /> : null}
    {status === 'error' ? <ErrorState message="دریافت منابع آموزشی ناموفق بود." onRetry={() => setRevision((value) => value + 1)} /> : null}
    {status === 'ready' && !resources.length ? <EmptyState title="هنوز منبعی برای شما منتشر نشده است." /> : null}
    {status === 'ready' && resources.length ? <div className="resource-library__grid">{resources.map((resource) => <article key={resource.id} className="resource-card">
      <span className="resource-card__icon">{resourceIcon(resource.type)}</span>
      <div><small>{resourceLabel(resource.type)}</small><h2>{resource.title}</h2>{resource.description ? <p>{resource.description}</p> : null}</div>
      <a href={resource.url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />باز کردن منبع</a>
    </article>)}</div> : null}
  </section>;
}

function resourceIcon(type: string) {
  if (type === 'VIDEO') return <Video aria-hidden="true" />;
  return <Link2 aria-hidden="true" />;
}

function resourceLabel(type: string) {
  if (type === 'VIDEO') return 'ویدئو';
  return 'پیوند';
}
