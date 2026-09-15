import { CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/api-client';

type Mistake = { id: string; questionId: string; reason: string; resolved: boolean };
const reasons = ['بی‌دقتی', 'ضعف مفهومی', 'فراموشی فرمول', 'کمبود زمان', 'برداشت نادرست از سؤال'];

export function MistakeNotebook() {
  const [items, setItems] = useState<Mistake[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [savingId, setSavingId] = useState('');
  const load = useCallback(async () => {
    setStatus('loading');
    try { setItems(await apiClient.request<Mistake[]>('GET', '/student/mistakes?limit=200')); setStatus('ready'); }
    catch { setStatus('error'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function update(item: Mistake, patch: Partial<Pick<Mistake, 'reason' | 'resolved'>>) {
    setSavingId(item.id);
    try {
      const saved = await apiClient.request<Mistake, typeof patch>('PATCH', `/student/mistakes/${item.id}`, patch);
      setItems((current) => current.map((value) => value.id === item.id ? saved : value));
    } finally { setSavingId(''); }
  }

  if (status === 'loading') return <p className="settings-empty" role="status">در حال دریافت دفترچه اشتباهات…</p>;
  if (status === 'error') return <div className="settings-empty" role="alert"><p>دریافت دفترچه ناموفق بود.</p><button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" />تلاش دوباره</button></div>;
  if (!items.length) return <p className="settings-empty">هنوز اشتباهی برای مرور ثبت نشده است.</p>;
  return <ul className="space-y-3">{items.map((item, index) => <li className={`surface rounded-3xl p-4 ${item.resolved ? 'opacity-70' : ''}`} key={item.id}>
    <header className="flex items-center gap-2">{item.resolved ? <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" /> : <CircleAlert className="size-5 text-amber-600" aria-hidden="true" />}<strong>اشتباه شماره {(index + 1).toLocaleString('fa-IR')}</strong><small className="mr-auto text-ink/50">شناسه سؤال {item.questionId}</small></header>
    <label className="mt-3 block text-sm font-bold" htmlFor={`mistake-reason-${item.id}`}>دلیل اشتباه</label>
    <select id={`mistake-reason-${item.id}`} className="mt-1 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3" value={item.reason} disabled={savingId === item.id} onChange={(event) => void update(item, { reason: event.target.value })}><option value="">انتخاب نشده</option>{reasons.map((reason) => <option key={reason}>{reason}</option>)}</select>
    <button type="button" className="mt-3 min-h-11 w-full rounded-xl border border-ink/15 px-3 font-bold" disabled={savingId === item.id} onClick={() => void update(item, { resolved: !item.resolved })}>{item.resolved ? 'بازگشت به فهرست مرور' : 'مرور شد'}</button>
  </li>)}</ul>;
}
