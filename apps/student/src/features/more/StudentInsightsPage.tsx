import { BarChart3, Check, Lightbulb, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/api-client';

type Analytics = {
  planCompletion: number | null;
  studyDurationMinutes: number | null;
  studySessions: number;
  examPerformance: number | null;
  questionAccuracy: number | null;
  reviewConsistency: number;
  averageMastery: number | null;
};
type Recommendation = { id: string; type: string; title: string; status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'DISMISSED'; createdAt: string };

export function StudentInsightsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [actingId, setActingId] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [metrics, proposed] = await Promise.all([
        apiClient.request<Analytics>('GET', '/student/analytics'),
        apiClient.request<Recommendation[]>('GET', '/recommendations'),
      ]);
      setAnalytics(metrics);
      setRecommendations(proposed);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(item: Recommendation, next: 'ACCEPTED' | 'REJECTED') {
    setActingId(item.id);
    try {
      await apiClient.request('PATCH', `/recommendations/${item.id}`, { status: next });
      setRecommendations((current) => current.filter((value) => value.id !== item.id));
    } finally {
      setActingId('');
    }
  }

  if (status === 'loading') return <p className="settings-empty" role="status">در حال محاسبه روند شما…</p>;
  if (status === 'error') return <div className="settings-empty" role="alert"><p>دریافت تحلیل عملکرد ناموفق بود.</p><button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" />تلاش دوباره</button></div>;

  const metrics = [
    ['تکمیل برنامه', value(analytics?.planCompletion, '٪')],
    ['زمان مطالعه', value(analytics?.studyDurationMinutes, ' دقیقه')],
    ['میانگین آزمون', value(analytics?.examPerformance)],
    ['دقت پاسخ', value(analytics?.questionAccuracy, '٪')],
    ['جلسه مطالعه', value(analytics?.studySessions)],
    ['مرور ثبت‌شده', value(analytics?.reviewConsistency)],
  ];
  return <div className="space-y-4">
    <section className="surface rounded-3xl p-4" aria-labelledby="student-analytics-title">
      <header className="flex items-center gap-2"><BarChart3 className="size-5 text-mint" aria-hidden="true" /><h2 id="student-analytics-title" className="font-black">تصویر عملکرد من</h2></header>
      <div className="mt-3 grid grid-cols-2 gap-2">{metrics.map(([label, metric]) => <div className="rounded-2xl bg-paper p-3" key={label}><small className="text-ink/60">{label}</small><strong className="mt-1 block text-lg">{metric}</strong></div>)}</div>
    </section>
    <section className="surface rounded-3xl p-4" aria-labelledby="student-recommendations-title">
      <header className="flex items-center gap-2"><Lightbulb className="size-5 text-amber-600" aria-hidden="true" /><h2 id="student-recommendations-title" className="font-black">پیشنهادهای مشاور</h2></header>
      {!recommendations.length ? <p className="mt-3 text-sm text-ink/60">پیشنهاد جدیدی برای تصمیم‌گیری ندارید.</p> : <ul className="mt-3 space-y-2">{recommendations.map((item) => <li className="rounded-2xl border border-ink/10 p-3" key={item.id}><strong>{item.title}</strong><small className="mt-1 block text-ink/55">{recommendationType(item.type)}</small><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="min-h-11 rounded-xl bg-mint px-3 font-bold text-white" disabled={actingId === item.id} onClick={() => void act(item, 'ACCEPTED')}><Check className="inline size-4" aria-hidden="true" /> می‌پذیرم</button><button type="button" className="min-h-11 rounded-xl border border-ink/15 px-3 font-bold" disabled={actingId === item.id} onClick={() => void act(item, 'REJECTED')}><X className="inline size-4" aria-hidden="true" /> رد می‌کنم</button></div></li>)}</ul>}
    </section>
  </div>;
}

function value(input: number | null | undefined, suffix = '') { return input == null ? '—' : `${input.toLocaleString('fa-IR')}${suffix}`; }
function recommendationType(type: string) { return type === 'FOLLOW_UP' ? 'پیگیری آموزشی' : type === 'STUDY' ? 'مطالعه' : 'پیشنهاد آموزشی'; }
