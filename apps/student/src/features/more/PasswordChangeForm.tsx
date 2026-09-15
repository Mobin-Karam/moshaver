import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../services/api-client';

export function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmation) { setError('همه فیلدهای رمز عبور را کامل کنید.'); return; }
    if (newPassword.length < 12) { setError('رمز جدید باید حداقل ۱۲ نویسه داشته باشد.'); return; }
    if (newPassword !== confirmation) { setError('تکرار رمز عبور با رمز جدید یکسان نیست.'); return; }
    if (newPassword === currentPassword) { setError('رمز جدید باید با رمز فعلی متفاوت باشد.'); return; }
    setStatus('saving'); setError('');
    try {
      await apiClient.request('POST', '/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setStatus('success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تغییر رمز عبور ناموفق بود.'); setStatus('error');
    }
  }

  return <div className="password-change">
    <button type="button" className="password-change__toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}><KeyRound aria-hidden="true" /><span><strong>تغییر رمز عبور</strong><small>پس از تغییر، نشست دستگاه‌های دیگر لغو می‌شود.</small></span></button>
    {open ? <form onSubmit={submit}>
      <PasswordField label="رمز فعلی" value={currentPassword} visible={visible} autoComplete="current-password" onChange={setCurrentPassword} />
      <PasswordField label="رمز جدید" value={newPassword} visible={visible} autoComplete="new-password" onChange={setNewPassword} />
      <PasswordField label="تکرار رمز جدید" value={confirmation} visible={visible} autoComplete="new-password" onChange={setConfirmation} />
      <button type="button" className="password-change__visibility" onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{visible ? 'پنهان کردن رمزها' : 'نمایش رمزها'}</button>
      {error ? <p role="alert">{error}</p> : null}
      {status === 'success' ? <p className="password-change__success" role="status">رمز عبور تغییر کرد و نشست‌های دیگر لغو شدند.</p> : null}
      <button type="submit" className="password-change__submit" disabled={status === 'saving'}>{status === 'saving' ? 'در حال تغییر…' : 'تغییر رمز عبور'}</button>
    </form> : null}
  </div>;
}

function PasswordField({ label, value, visible, autoComplete, onChange }: { label: string; value: string; visible: boolean; autoComplete: string; onChange(value: string): void }) {
  return <label>{label}<input dir="ltr" type={visible ? 'text' : 'password'} autoComplete={autoComplete} maxLength={300} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
