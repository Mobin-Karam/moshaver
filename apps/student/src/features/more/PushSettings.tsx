import { Bell, BellOff, RefreshCw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { disablePwaPushSubscription, getPushStatus, requestNotificationPermission, savePushPreferences, sendTestPush, type PushPreferences, type PushStatus } from '../../services/notification-service';

const categories: Array<{ key: keyof PushPreferences; label: string }> = [{ key: 'messages', label: 'پیام‌های گفتگو' }, { key: 'exams', label: 'آزمون‌ها' }, { key: 'lessons', label: 'برنامه و درس' }, { key: 'announcements', label: 'اطلاعیه‌ها' }];

export function PushSettings() {
  const [push, setPush] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState('load');
  const [message, setMessage] = useState('');
  async function load() { setBusy('load'); setMessage(''); try { setPush(await getPushStatus()); } catch (error) { setMessage(readableError(error)); } finally { setBusy(''); } }
  useEffect(() => { void load(); }, []);
  async function enable() { setBusy('enable'); setMessage(''); try { const permission = await requestNotificationPermission(); if (permission !== 'granted') throw new Error(permission === 'denied' ? 'اجازه اعلان در تنظیمات دستگاه مسدود شده است.' : 'اجازه اعلان داده نشد.'); setPush(await getPushStatus()); setMessage('اعلان این دستگاه فعال شد.'); } catch (error) { setMessage(readableError(error)); } finally { setBusy(''); } }
  async function disable() { setBusy('disable'); setMessage(''); try { await disablePwaPushSubscription(); setPush(await getPushStatus()); setMessage('اعلان این دستگاه غیرفعال شد.'); } catch (error) { setMessage(readableError(error)); } finally { setBusy(''); } }
  async function preference(key: keyof PushPreferences, value: boolean) { if (!push) return; const previous = push; const next = { ...push, preferences: { ...push.preferences, [key]: value } }; setPush(next); setBusy(key); try { await savePushPreferences(next.preferences); } catch (error) { setPush(previous); setMessage(readableError(error)); } finally { setBusy(''); } }
  async function test() { setBusy('test'); setMessage(''); try { const result = await sendTestPush(); setMessage(result.pushConfigured ? 'اعلان آزمایشی ارسال شد.' : 'اعلان ثبت شد، اما Push روی سرور پیکربندی نشده است.'); } catch (error) { setMessage(readableError(error)); } finally { setBusy(''); } }

  return <div className="push-settings">
    {busy === 'load' ? <p className="settings-empty" role="status">در حال دریافت تنظیمات اعلان…</p> : null}
    {push ? <><div className={`push-settings__status ${push.registered ? 'is-active' : ''}`}>{push.registered ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}<span><strong>{push.registered ? 'اعلان سیستمی فعال است' : 'اعلان سیستمی غیرفعال است'}</strong><small>{!push.supported ? 'این دستگاه Push را پشتیبانی نمی‌کند.' : !push.serverConfigured ? 'کلیدهای Push روی سرور تنظیم نشده‌اند.' : push.permission === 'denied' ? 'مجوز اعلان در دستگاه مسدود است.' : 'وضعیت همین دستگاه'}</small></span></div><div className="push-settings__actions">{push.registered ? <button type="button" className="is-danger" disabled={Boolean(busy)} onClick={() => void disable()}>غیرفعال‌سازی</button> : <button type="button" disabled={Boolean(busy) || !push.supported || !push.serverConfigured || push.permission === 'denied'} onClick={() => void enable()}>فعال‌سازی</button>}<button type="button" disabled={Boolean(busy) || !push.registered} onClick={() => void test()}><Send aria-hidden="true" />آزمایش</button><button type="button" disabled={Boolean(busy)} onClick={() => void load()} aria-label="به‌روزرسانی وضعیت اعلان"><RefreshCw aria-hidden="true" /></button></div><div className="push-settings__categories">{categories.map((category) => <label key={category.key}><span>{category.label}</span><input type="checkbox" checked={push.preferences[category.key]} disabled={Boolean(busy)} onChange={(event) => void preference(category.key, event.target.checked)} /><i aria-hidden="true" /></label>)}</div></> : null}
    {message ? <p className="push-settings__message" role="status">{message}</p> : null}
  </div>;
}
function readableError(error: unknown) { return error instanceof Error && error.message ? error.message : 'عملیات اعلان ناموفق بود.'; }
