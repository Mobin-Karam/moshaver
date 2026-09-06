import { ArrowRight, Check, CircleAlert, Cloud, Database, LockKeyhole, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ExamSummary } from '@moshaver/student-core';

export function ExamPreflight({ exam, busy, error, onBack, onStart }: { exam: ExamSummary; busy: boolean; error: string; onBack: () => void; onStart: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const storageAvailable = useMemo(() => testStorage(), []);
  const online = navigator.onLine;
  const canStart = Boolean(exam.delivery?.canStart && storageAvailable && accepted);

  return (
    <section className="mx-auto max-w-xl space-y-4 pb-4" aria-labelledby="preflight-title">
      <button className="back-action" onClick={onBack}><ArrowRight size={18} />بازگشت به آزمون‌ها</button>
      <header className="rounded-[1.75rem] bg-ink p-5 text-white">
        <span className="text-xs text-white/65">پیش از شروع، با آرامش بررسی کن</span>
        <h1 id="preflight-title" className="mt-2 text-2xl font-black">{exam.title}</h1>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Info icon={<Timer />} text={`${exam.durationMinutes || 0} دقیقه`} />
          <Info icon={<CircleAlert />} text={`${exam.delivery?.questionCount || 0} سؤال`} />
        </div>
      </header>

      <article className="surface rounded-3xl p-4">
        <h2 className="font-black">قوانین و شیوه نمره‌دهی</h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-ink/70">
          {(exam.instructions?.length ? exam.instructions : ['پس از شروع، زمان آزمون متوقف نمی‌شود.', 'پاسخ‌ها خودکار روی دستگاه و سپس سرور ذخیره می‌شوند.']).map((item) => <li key={item} className="flex gap-2"><Check className="mt-1.5 size-4 shrink-0 text-mint" />{item}</li>)}
          <li className="flex gap-2"><Check className="mt-1.5 size-4 shrink-0 text-mint" />{exam.scoring?.negativeMarking ? `نمره منفی فعال است؛ پاسخ غلط ${Math.abs(exam.scoring.wrong)} امتیاز کسر می‌کند.` : 'نمره منفی برای این آزمون فعال نیست.'}</li>
          <li className="flex gap-2"><Check className="mt-1.5 size-4 shrink-0 text-mint" />{exam.allowBackNavigation === false ? 'بازگشت به سؤال قبلی مجاز نیست.' : 'می‌توانی بین سؤال‌ها جابه‌جا شوی.'}</li>
          <li className="flex gap-2"><Check className="mt-1.5 size-4 shrink-0 text-mint" />نتیجه مطابق سیاست انتشار برگزارکننده نمایش داده می‌شود.</li>
        </ul>
      </article>

      <article className="surface rounded-3xl p-4">
        <h2 className="font-black">بررسی آمادگی</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <CheckRow ok label="نشست کاربری معتبر" icon={<LockKeyhole />} />
          <CheckRow ok={Boolean(exam.delivery)} label="تخصیص و انتشار آزمون تأیید شد" icon={<Check />} />
          <CheckRow ok={storageAvailable} label={storageAvailable ? 'ذخیره‌سازی دستگاه آماده است' : 'ذخیره‌سازی مرورگر در دسترس نیست'} icon={<Database />} />
          <CheckRow ok={online} warning={!online} label={online ? 'اتصال اینترنت برقرار است' : 'بدون اتصال؛ شروع جدید تا اتصال مجدد امن نیست'} icon={<Cloud />} />
        </div>
      </article>

      {error ? <p className="state-error" role="alert">{error}</p> : null}
      <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-ink/15 bg-white px-4 py-3 font-bold">
        <input type="checkbox" className="size-5 accent-ink" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        قوانین آزمون را خواندم
      </label>
      <button className="primary-action min-h-14" disabled={!canStart || busy || !online} onClick={onStart}>{busy ? 'در حال بررسی نهایی…' : exam.delivery?.activeAttemptId ? 'ادامه آزمون' : 'شروع آزمون'}</button>
    </section>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) { return <span className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 [&>svg]:size-4">{icon}{text}</span>; }
function CheckRow({ ok, warning = false, label, icon }: { ok: boolean; warning?: boolean; label: string; icon: React.ReactNode }) { return <div className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${ok ? 'bg-emerald-50 text-emerald-900' : warning ? 'bg-amber-50 text-amber-900' : 'bg-rose-50 text-rose-900'}`}><span className="[&>svg]:size-5">{icon}</span><span>{label}</span><strong className="mr-auto text-xs">{ok ? 'آماده' : warning ? 'محدود' : 'ناموفق'}</strong></div>; }
function testStorage() { try { const key = '__exam_preflight__'; localStorage.setItem(key, '1'); localStorage.removeItem(key); return true; } catch { return false; } }
