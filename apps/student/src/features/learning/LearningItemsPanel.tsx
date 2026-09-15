import { CheckCircle2, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../../services/api-client';

interface LearningItem { id: string; title: string; subject?: string; note?: string; dueDate?: string; status: 'pending' | 'done' | 'archived'; mastery?: number; }

export function LearningItemsPanel() {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ title: '', subject: '', dueDate: new Date().toISOString().slice(0, 10), note: '' });

  async function load() { setStatus('loading'); setError(''); try { setItems(await apiClient.request<LearningItem[]>('GET', '/learning/items')); setStatus('ready'); } catch (reason) { setError(readableError(reason)); setStatus('error'); } }
  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const title = draft.title.trim();
    if (title.length < 2) { setError('عنوان باید حداقل دو نویسه داشته باشد.'); return; }
    setStatus('saving'); setError('');
    try { const created = await apiClient.request<LearningItem, typeof draft>('POST', '/learning/items', { ...draft, title, subject: draft.subject.trim(), note: draft.note.trim() }); setItems((current) => [...current, created]); setDraft((current) => ({ ...current, title: '', subject: '', note: '' })); setStatus('ready'); }
    catch (reason) { setError(readableError(reason)); setStatus('error'); }
  }
  async function update(item: LearningItem, changes: Partial<LearningItem>) { setStatus('saving'); setError(''); try { const saved = await apiClient.request<LearningItem, Partial<LearningItem>>('PATCH', `/learning/items/${encodeURIComponent(item.id)}`, changes); setItems((current) => current.map((candidate) => candidate.id === item.id ? saved : candidate)); setStatus('ready'); } catch (reason) { setError(readableError(reason)); setStatus('error'); } }
  async function review(item: LearningItem, rating: number) { setStatus('saving'); setError(''); try { const result = await apiClient.request<{ item: LearningItem }, { rating: number }>('POST', `/learning/items/${encodeURIComponent(item.id)}/review`, { rating }); setItems((current) => current.map((candidate) => candidate.id === item.id ? result.item : candidate)); setStatus('ready'); } catch (reason) { setError(readableError(reason)); setStatus('error'); } }
  async function remove(item: LearningItem) { if (!window.confirm(`«${item.title}» حذف شود؟`)) return; setStatus('saving'); setError(''); try { await apiClient.request('DELETE', `/learning/items/${encodeURIComponent(item.id)}`); setItems((current) => current.filter((candidate) => candidate.id !== item.id)); setStatus('ready'); } catch (reason) { setError(readableError(reason)); setStatus('error'); } }

  return <section className="learning-items" aria-labelledby="learning-items-title">
    <header><div><h2 id="learning-items-title">جعبه مرور شخصی</h2><p>موضوع‌های شخصی را بساز، زمان مرور را ثبت کن و میزان یادگیری را امتیاز بده.</p></div><button type="button" onClick={() => void load()} aria-label="به‌روزرسانی مرورها"><RotateCcw aria-hidden="true" /></button></header>
    <form className="learning-items__create" onSubmit={create}><label>عنوان مرور<input maxLength={2000} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="مثلاً مرور اتحادها" /></label><div><label>درس<input maxLength={120} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label><label>تاریخ مرور<input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label></div><label>یادداشت<textarea maxLength={5000} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label><button type="submit" disabled={status === 'saving'}><Plus aria-hidden="true" />افزودن مرور</button></form>
    {error ? <p className="learning-items__error" role="alert">{error}</p> : null}{status === 'loading' ? <p className="settings-empty" role="status">در حال دریافت مرورهای شخصی…</p> : null}
    <div className="learning-items__list">{items.filter((item) => item.status !== 'archived').map((item) => <article key={item.id} className={item.status === 'done' ? 'is-done' : ''}><div><strong>{item.title}</strong><small>{[item.subject, item.dueDate ? formatDate(item.dueDate) : ''].filter(Boolean).join(' · ')}</small>{item.note ? <p>{item.note}</p> : null}</div><div className="learning-items__rating" aria-label={`امتیاز یادگیری ${item.title}`}>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} disabled={status === 'saving'} onClick={() => void review(item, rating)} aria-label={`امتیاز ${rating}`}><Star className={rating <= Number(item.mastery || 0) ? 'is-active' : ''} aria-hidden="true" /></button>)}</div><div className="learning-items__actions"><button type="button" disabled={status === 'saving'} onClick={() => void update(item, { status: item.status === 'done' ? 'pending' : 'done' })}>{item.status === 'done' ? <RotateCcw aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{item.status === 'done' ? 'بازکردن' : 'انجام شد'}</button><button type="button" className="is-danger" disabled={status === 'saving'} onClick={() => void remove(item)}><Trash2 aria-hidden="true" />حذف</button></div></article>)}{status === 'ready' && !items.length ? <p className="settings-empty">هنوز مرور شخصی نساخته‌اید.</p> : null}</div>
  </section>;
}

function readableError(error: unknown) { return error instanceof Error && error.message ? error.message : 'عملیات مرور ناموفق بود.'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)); }
