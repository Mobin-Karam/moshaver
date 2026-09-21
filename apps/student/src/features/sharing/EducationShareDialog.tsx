import { LoaderCircle, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api-client';

type Peer = { id: string; name: string; grade?: string; organizationName: string };

export function EducationShareDialog({ endpoint, title, onClose }: { endpoint: string; title: string; onClose(): void }) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void apiClient.request<Peer[]>('GET', '/education-sharing/peers').then((items) => {
      if (!active) return;
      setPeers(items);
      setTargetStudentId(items[0]?.id || '');
      setStatus('ready');
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : 'دریافت فهرست دانش‌آموزان ناموفق بود.');
      setStatus('error');
    });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!targetStudentId) return;
    setStatus('saving');
    setMessage('');
    try {
      await apiClient.request('POST', endpoint, { targetStudentId }, { skipSyncQueue: true });
      setStatus('success');
      setMessage('با موفقیت به اشتراک گذاشته شد.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'اشتراک‌گذاری ناموفق بود.');
    }
  }

  return <div className="education-share-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="education-share-dialog" role="dialog" aria-modal="true" aria-labelledby="education-share-title" onSubmit={submit}>
      <header><div><small>اشتراک امن در سازمان</small><h2 id="education-share-title">{title}</h2></div><button type="button" onClick={onClose} aria-label="بستن"><X /></button></header>
      {status === 'loading' ? <p className="education-share-dialog__state"><LoaderCircle className="spin" />در حال دریافت دانش‌آموزان…</p> : null}
      {status !== 'loading' && !peers.length && status !== 'error' ? <p className="education-share-dialog__state">دانش‌آموز فعال دیگری در سازمان شما وجود ندارد.</p> : null}
      {peers.length ? <label>دانش‌آموز گیرنده<select value={targetStudentId} onChange={(event) => setTargetStudentId(event.target.value)} disabled={status === 'saving' || status === 'success'}>{peers.map((peer) => <option key={peer.id} value={peer.id}>{peer.name} · {peer.grade || peer.organizationName}</option>)}</select></label> : null}
      {message ? <p role={status === 'error' ? 'alert' : 'status'} className={status === 'error' ? 'is-error' : 'is-success'}>{message}</p> : null}
      <footer><button type="button" className="secondary" onClick={onClose}>انصراف</button><button type="submit" className="primary" disabled={!targetStudentId || status === 'saving' || status === 'success'}>{status === 'saving' ? <LoaderCircle className="spin" /> : <Share2 />}{status === 'success' ? 'ارسال شد' : 'اشتراک‌گذاری'}</button></footer>
    </form>
  </div>;
}
