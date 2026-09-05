import { BarChart3, KeyRound, LogOut, Monitor, MoonStar, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { useStudentStore } from '../../services/student-store';

export function MorePage() {
  const student = useStudentStore((state) => state.student);
  const user = useStudentStore((state) => state.user);
  const syncStatus = useStudentStore((state) => state.syncStatus);
  const logout = useStudentStore((state) => state.logout);
  const notifications = useStudentStore((state) => state.notifications);
  const subjects = useStudentStore((state) => state.subjects);
  const relationships = useStudentStore((state) => state.relationships);
  const mistakes = useStudentStore((state) => state.mistakes);
  const loadProfileDomains = useStudentStore((state) => state.loadProfileDomains);
  const loadNotifications = useStudentStore((state) => state.loadNotifications);
  const markNotificationRead = useStudentStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useStudentStore((state) => state.markAllNotificationsRead);
  const authSessions = useStudentStore((state) => state.authSessions);
  const loadAuthSessions = useStudentStore((state) => state.loadAuthSessions);
  const revokeAuthSession = useStudentStore((state) => state.revokeAuthSession);
  const error = useStudentStore((state) => state.error);
  const nightReportDraft = useStudentStore((state) => state.nightReportDraft);
  const recoveryRequestDraft = useStudentStore((state) => state.recoveryRequestDraft);
  const saveNightReportDraft = useStudentStore((state) => state.saveNightReportDraft);
  const saveRecoveryRequestDraft = useStudentStore((state) => state.saveRecoveryRequestDraft);
  const submitNightReport = useStudentStore((state) => state.submitNightReport);
  const submitRecoveryRequest = useStudentStore((state) => state.submitRecoveryRequest);

  useEffect(() => {
    void loadNotifications();
    void loadAuthSessions();
    void loadProfileDomains();
  }, [loadAuthSessions, loadNotifications, loadProfileDomains]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">بیشتر</h1>
      <article className="surface p-4">
        <h2 className="font-semibold">{student?.name || user?.username || 'دانش‌آموز'}</h2>
        <p className="mt-2 text-sm text-ink/65">{[student?.grade, student?.major].filter(Boolean).join(' | ') || 'پرونده دانش‌آموز'}</p>
      </article>
      <article className="surface p-4">
        <h2 className="font-semibold">درس‌ها و ارتباطات پرونده</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-md bg-paper p-3"><strong className="text-sm">درس‌های فعال</strong><p className="mt-1 text-sm text-ink/65">{subjects.filter((item) => item.enabled).map((item) => item.displayName || item.subject.name).join('، ') || 'درسی ثبت نشده است.'}</p></div>
          <div className="rounded-md bg-paper p-3"><strong className="text-sm">ارتباط‌های فعال</strong><p className="mt-1 text-sm text-ink/65">{relationships.filter((item) => item.status === 'ACTIVE').map((item) => `${item.type}: ${[item.fromUser?.firstName, item.fromUser?.lastName].filter(Boolean).join(' ') || item.fromUser?.username || 'کاربر'}`).join('، ') || 'ارتباط فعالی ثبت نشده است.'}</p></div>
        </div>
        <div className="mt-2 rounded-md bg-paper p-3"><strong className="text-sm">اشتباه‌های نیازمند مرور</strong><p className="mt-1 text-sm text-ink/65">{mistakes.length ? `${mistakes.length.toLocaleString('fa-IR')} مورد در دفترچه اشتباهات` : 'موردی ثبت نشده است.'}</p></div>
      </article>
            <Link to="/learning" className="surface flex items-center justify-between gap-3 p-4">
              <div>
                <h2 className="font-semibold">پیشرفت و مرور</h2>
                <p className="mt-1 text-sm text-ink/65">گزارش پیشرفت مطالعه و مرورهای ثبت‌شده</p>
              </div>
              <BarChart3 className="shrink-0 text-mint" size={22} />
            </Link>
      <article className="surface p-4">
        <div className="flex items-start gap-3">
          <MoonStar className="mt-0.5 shrink-0 text-mint" size={20} />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">گزارش شبانه</h2>
            <p className="mt-1 text-sm text-ink/60">پیش‌نویس ابتدا روی دستگاه حفظ و سپس با API v2 ثبت می‌شود.</p>
            <NightReportForm draft={nightReportDraft} onSave={saveNightReportDraft} onSubmit={submitNightReport} />
          </div>
        </div>
      </article>
      <article className="surface p-4">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 shrink-0 text-ink/45" size={20} />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">درخواست جبران</h2>
            <p className="mt-1 text-sm text-ink/60">پیش‌نویس ابتدا روی دستگاه حفظ و سپس با API v2 ارسال می‌شود.</p>
            <RecoveryRequestForm draft={recoveryRequestDraft} onSave={saveRecoveryRequestDraft} onSubmit={submitRecoveryRequest} />
          </div>
        </div>
      </article>
      <article className="surface p-4">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 shrink-0 text-ink/45" size={20} />
          <div>
            <h2 className="font-semibold">رمز عبور</h2>
            <p className="mt-1 text-sm text-ink/60">تغییر رمز حساب از مسیر امن API v2 انجام می‌شود و نشست‌های دیگر را می‌بندد.</p>
          </div>
        </div>
      </article>
      <article className="surface p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={20} />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">نشست‌های حساب</h2>
            <p className="mt-1 text-sm text-ink/60">نشست‌های فعال حساب را بررسی و نشست‌های دیگر را لغو کنید.</p>
            {authSessions.length ? (
              <div className="mt-3 space-y-2">
                {authSessions.map((session) => (
                  <div className="flex items-center justify-between gap-3 rounded-md bg-paper px-3 py-3" key={session.id}>
                    <div className="flex min-w-0 items-center gap-2">
                      <Monitor className="shrink-0 text-ink/55" size={17} />
                      <div className="min-w-0 text-sm">
                        <p className="truncate font-medium">{session.current ? 'نشست فعلی' : 'نشست دیگر'}</p>
                        <p className="text-xs text-ink/55">ایجاد: {formatDate(session.createdAt)} | انقضا: {formatDate(session.expiresAt)}</p>
                      </div>
                    </div>
                    <button type="button" className="shrink-0 rounded-md bg-white px-2 py-1 text-xs text-red-700" onClick={() => void revokeAuthSession(session.id)}>
                      {session.current ? 'خروج از این نشست' : 'لغو نشست'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-paper px-3 py-3 text-sm text-ink/60">نشستی برای نمایش وجود ندارد.</p>
            )}
          </div>
        </div>
      </article>
      <article className="surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">اعلان‌ها</h2>
          <div className="flex items-center gap-2 text-sm text-ink/65">
            <span>خوانده‌نشده: {notifications.filter((notification) => !notification.readAt).length}</span>
            <button type="button" className="rounded-md bg-paper px-2 py-1 text-xs" onClick={() => void markAllNotificationsRead()}>خواندن همه</button>
          </div>
        </div>
        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {notifications.length ? (
          <div className="mt-3 space-y-2">
            {notifications.map((notification) => (
              <button type="button" key={notification.id} className={`block w-full rounded-md bg-paper px-3 py-3 text-right ${notification.readAt ? 'opacity-70' : ''}`} onClick={() => !notification.readAt && void markNotificationRead(notification.id)}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{notification.title}</h3>
                  {!notification.readAt ? <span className="mt-1 size-2 shrink-0 rounded-full bg-mint" aria-label="خوانده‌نشده" /> : null}
                </div>
                <p className="mt-1 text-sm text-ink/65">{notification.message}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-md bg-paper px-3 py-3 text-sm text-ink/60">اعلانی برای نمایش وجود ندارد.</p>
        )}
      </article>
      <article className="surface p-4">
        <h2 className="font-semibold">ذخیره‌سازی و همگام‌سازی</h2>
        <p className="mt-2 text-sm text-ink/65">وضعیت: {syncStatus}</p>
      </article>
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-white" onClick={() => void logout()}>
        <LogOut size={18} />
        خروج
      </button>
    </section>
  );
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

function NightReportForm({ draft, onSave, onSubmit }: { draft: ReturnType<typeof useStudentStore.getState>['nightReportDraft']; onSave: ReturnType<typeof useStudentStore.getState>['saveNightReportDraft']; onSubmit: ReturnType<typeof useStudentStore.getState>['submitNightReport'] }) {
  const [sleepHours, setSleepHours] = useState(draft?.sleepHours ?? '');
  const [studyMinutes, setStudyMinutes] = useState(draft?.studyMinutes ?? '');
  const [mood, setMood] = useState(draft?.mood ?? '');
  const [note, setNote] = useState(draft?.note ?? '');
  const [status, setStatus] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'saving') return;
    const sleep = Number(sleepHours);
    const study = Number(studyMinutes);
    if (!sleepHours || !Number.isFinite(sleep) || sleep < 0 || sleep > 24) return invalid('مدت خواب را بین ۰ تا ۲۴ ساعت وارد کنید.');
    if (!studyMinutes || !Number.isInteger(study) || study < 0 || study > 1440) return invalid('مدت مطالعه را به‌صورت عدد صحیح بین ۰ تا ۱۴۴۰ دقیقه وارد کنید.');
    if (!mood.trim()) return invalid('حال‌وهوای امروز را انتخاب کنید.');
    setStatus('saving');
    setMessage('در حال ذخیره پیش‌نویس');
    try {
      const values = { sleepHours, studyMinutes, mood, note: note.trim() };
      await onSave(values);
      await onSubmit(values);
      setStatus('success');
      setMessage('گزارش با موفقیت ثبت شد.');
    } catch {
      setStatus('error');
      setMessage('ذخیره پیش‌نویس انجام نشد.');
    }
  }

  function invalid(text: string) {
    setStatus('error');
    setMessage(text);
  }

  return <form className="mt-4 space-y-3" onSubmit={submit}>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="خواب (ساعت)" type="number" min="0" max="24" step="0.5" value={sleepHours} onChange={setSleepHours} /><Field label="مطالعه (دقیقه)" type="number" min="0" max="1440" step="1" value={studyMinutes} onChange={setStudyMinutes} /></div>
    <label className="block space-y-1 text-sm"><span>حال‌وهوای امروز</span><select className="w-full rounded-md border border-black/10 bg-white px-3 py-2" value={mood} onChange={(event) => setMood(event.target.value)}><option value="">انتخاب کنید</option><option value="خوب">خوب</option><option value="معمولی">معمولی</option><option value="خسته">خسته</option><option value="پراسترس">پراسترس</option></select></label>
    <Field label="یادداشت (اختیاری)" value={note} onChange={setNote} multiline />
    <SaveStatus status={status} message={message} /><button type="submit" disabled={status === 'saving'} className="rounded-md bg-mint px-3 py-2 text-sm text-white disabled:opacity-60">{status === 'saving' ? 'در حال ذخیره' : 'ذخیره گزارش'}</button>
  </form>;
}

function RecoveryRequestForm({ draft, onSave, onSubmit }: { draft: ReturnType<typeof useStudentStore.getState>['recoveryRequestDraft']; onSave: ReturnType<typeof useStudentStore.getState>['saveRecoveryRequestDraft']; onSubmit: ReturnType<typeof useStudentStore.getState>['submitRecoveryRequest'] }) {
  const [date, setDate] = useState(draft?.date ?? new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState(draft?.reason ?? '');
  const [details, setDetails] = useState(draft?.details ?? '');
  const [status, setStatus] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'saving') return;
    if (!date || !reason.trim() || details.trim().length < 10) {
      setStatus('error');
      setMessage('تاریخ، دلیل و توضیح حداقل ۱۰ حرفی را کامل کنید.');
      return;
    }
    setStatus('saving');
    setMessage('در حال ذخیره پیش‌نویس');
    try {
      const values = { date, reason: reason.trim(), details: details.trim() };
      await onSave(values);
      await onSubmit(values);
      setStatus('success');
      setMessage('درخواست با موفقیت ارسال شد.');
    } catch {
      setStatus('error');
      setMessage('ذخیره پیش‌نویس انجام نشد.');
    }
  }

  return <form className="mt-4 space-y-3" onSubmit={submit}><Field label="تاریخ روز ازدست‌رفته" type="date" value={date} onChange={setDate} /><Field label="دلیل درخواست" value={reason} onChange={setReason} /><Field label="توضیحات" value={details} onChange={setDetails} multiline /><SaveStatus status={status} message={message} /><button type="submit" disabled={status === 'saving'} className="rounded-md bg-saffron px-3 py-2 text-sm text-white disabled:opacity-60">{status === 'saving' ? 'در حال ذخیره' : 'ذخیره درخواست'}</button></form>;
}

function Field({ label, value, onChange, multiline = false, ...props }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return <label className="block space-y-1 text-sm"><span>{label}</span>{multiline ? <textarea className="min-h-20 w-full rounded-md border border-black/10 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} /> : <input className="w-full rounded-md border border-black/10 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} {...props} />}</label>;
}

function SaveStatus({ status, message }: { status: SaveState; message: string }) {
  if (status === 'idle') return null;
  return <p role={status === 'error' ? 'alert' : 'status'} className={`rounded-md px-3 py-2 text-sm ${status === 'error' ? 'bg-red-50 text-red-700' : status === 'success' ? 'bg-mint/10 text-mint' : 'bg-paper text-ink/65'}`}>{message}</p>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
