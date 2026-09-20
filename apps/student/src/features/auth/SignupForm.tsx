import { CheckCircle2, LoaderCircle, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiClient } from '../../services/api-client';

type Label = { id: string; fa: string; en?: string };
type Grade = { id: number; fa: string; level_id: string };
type Structure = { grades: number[]; education_type_ids: string[]; track_required: boolean };
type SignupOptions = {
  schoolYear: string; grades: Grade[]; educationTypes: Array<Label & { levels: string[] }>;
  theoreticalTracks: Label[]; vocationalFields: Array<Label & { group_id?: string }>;
  gradeStructure: Structure[];
};
type Book = { id: string; titleFa: string; category: string };

export function SignupForm({ onLogin }: { onLogin(): void }) {
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState({ name: '', nationalCode: '', password: '', confirm: '', grade: '', educationTypeId: '', trackId: '' });
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'done' | 'error'>('loading');
  const [error, setError] = useState('');
  const structure = options?.gradeStructure.find((item) => item.grades.includes(Number(form.grade)));
  const educationTypes = options?.educationTypes.filter((item) => structure?.education_type_ids.includes(item.id)) || [];
  const tracks = form.educationTypeId === 'theoretical' ? options?.theoreticalTracks || [] : ['technical_vocational', 'kar_danesh'].includes(form.educationTypeId) ? options?.vocationalFields || [] : [];

  useEffect(() => {
    apiClient.request<SignupOptions>('GET', '/education-catalog/signup-options')
      .then((value) => { setOptions(value); setStatus('ready'); })
      .catch((cause) => { setError(cause instanceof Error ? cause.message : 'دریافت پایه‌ها ناموفق بود.'); setStatus('error'); });
  }, []);
  useEffect(() => {
    if (!form.grade) { setBooks([]); return; }
    const query = new URLSearchParams({ grade: form.grade });
    if (form.educationTypeId) query.set('educationTypeId', form.educationTypeId);
    if (form.trackId) query.set('trackId', form.trackId);
    apiClient.request<Book[]>('GET', `/education-catalog/books?${query}`).then(setBooks).catch(() => setBooks([]));
  }, [form.grade, form.educationTypeId, form.trackId]);
  const valid = useMemo(() => Boolean(form.name.trim().length >= 2 && validNationalCode(form.nationalCode) && form.password.length >= 12 && form.password === form.confirm && form.grade && form.educationTypeId && (!structure?.track_required || form.trackId)), [form, structure]);

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); setError(''); }
  function changeGrade(value: string) { const next = options?.gradeStructure.find((item) => item.grades.includes(Number(value))); const type = next?.education_type_ids.length === 1 ? next.education_type_ids[0] : ''; setForm((current) => ({ ...current, grade: value, educationTypeId: type || '', trackId: '' })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) { setError('اطلاعات هویتی و تحصیلی را کامل و درست وارد کنید.'); return; }
    setStatus('saving');
    try {
      await apiClient.request('POST', '/onboarding/student-signup', { name: form.name.trim(), nationalCode: normalizeDigits(form.nationalCode), password: form.password, grade: Number(form.grade), educationTypeId: form.educationTypeId, trackId: form.trackId || undefined }, { skipSyncQueue: true });
      setStatus('done');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ساخت حساب ناموفق بود.'); setStatus('ready'); }
  }

  if (status === 'done') return <div className="student-signup__success" role="status"><CheckCircle2 /><h2>حساب ساخته شد</h2><p>نام کاربری شما همان کد ملی است. پس از ورود، تخصیص مشاور و سازمان پیگیری می‌شود.</p><button type="button" className="student-login__submit" onClick={onLogin}>رفتن به ورود</button></div>;
  return <form className="student-login__card student-signup" onSubmit={(event) => void submit(event)} noValidate>
    <header><span><UserPlus aria-hidden="true" /></span><div><h2>ساخت حساب دانش‌آموز</h2><p>سال تحصیلی {options?.schoolYear || '۱۴۰۵–۱۴۰۶'}</p></div></header>
    {status === 'loading' ? <p role="status">در حال دریافت پایه‌ها…</p> : null}
    <label>نام و نام خانوادگی<input aria-label="نام و نام خانوادگی" value={form.name} maxLength={160} autoComplete="name" onChange={(event) => field('name', event.target.value)} /></label>
    <label>کد ملی<input aria-label="کد ملی" dir="ltr" inputMode="numeric" maxLength={10} autoComplete="username" value={form.nationalCode} onChange={(event) => field('nationalCode', event.target.value)} /><small>کد ملی نام کاربری شماست و فقط یک حساب می‌تواند داشته باشد.</small></label>
    <div className="student-signup__grid"><label>پایه<select aria-label="پایه" value={form.grade} onChange={(event) => changeGrade(event.target.value)}><option value="">انتخاب پایه</option>{options?.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.fa}</option>)}</select></label><label>نوع آموزش<select aria-label="نوع آموزش" value={form.educationTypeId} disabled={!form.grade} onChange={(event) => { field('educationTypeId', event.target.value); field('trackId', ''); }}><option value="">انتخاب نوع</option>{educationTypes.map((item) => <option key={item.id} value={item.id}>{item.fa}</option>)}</select></label></div>
    {structure?.track_required ? <label>رشته<select aria-label="رشته" value={form.trackId} disabled={!form.educationTypeId} onChange={(event) => field('trackId', event.target.value)}><option value="">انتخاب رشته</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.fa}</option>)}</select></label> : null}
    {form.grade ? <p className="student-signup__books">{books.length.toLocaleString('fa-IR')} کتاب مرتبط در فهرست ۱۴۰۵–۱۴۰۶ پیدا شد.</p> : null}
    <label>رمز عبور<input aria-label="رمز عبور جدید" dir="ltr" type="password" minLength={12} maxLength={300} autoComplete="new-password" value={form.password} onChange={(event) => field('password', event.target.value)} /><small>حداقل ۱۲ نویسه</small></label>
    <label>تکرار رمز عبور<input aria-label="تکرار رمز عبور" dir="ltr" type="password" maxLength={300} autoComplete="new-password" value={form.confirm} onChange={(event) => field('confirm', event.target.value)} /></label>
    {error ? <p className="student-login__error" role="alert">{error}</p> : null}
    <button className="student-login__submit" type="submit" disabled={!valid || status === 'saving' || status === 'loading'}>{status === 'saving' ? <LoaderCircle className="spin" /> : <UserPlus />}<span>{status === 'saving' ? 'در حال ساخت حساب…' : 'ساخت حساب'}</span></button>
  </form>;
}

function normalizeDigits(value: string) { return value.trim().replace(/[۰-۹٠-٩]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) >= 0 ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))); }
function validNationalCode(value: string) { const code = normalizeDigits(value); if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false; const sum = code.slice(0, 9).split('').reduce((total, digit, index) => total + Number(digit) * (10 - index), 0); const remainder = sum % 11; return Number(code[9]) === (remainder < 2 ? remainder : 11 - remainder); }
