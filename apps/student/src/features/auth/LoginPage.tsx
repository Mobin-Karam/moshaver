import { GraduationCap, LoaderCircle, LockKeyhole, LogIn, ShieldCheck, UserRound, WifiOff } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useStudentStore } from '../../services/student-store';
import { PasswordInput } from './PasswordInput';
import { SignupForm } from './SignupForm';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);
  const login = useStudentStore((state) => state.login);
  const loadStatus = useStudentStore((state) => state.loadStatus);
  const apiError = useStudentStore((state) => state.error);
  const usernameId = useId();
  const errorId = useId();
  const isLoading = loadStatus === 'loading';
  const error = validationError || apiError;

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => {
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setValidationError('نام کاربری و رمز عبور را کامل کنید.');
      return;
    }
    if (normalizedUsername.length > 120 || password.length > 300) {
      setValidationError('اطلاعات ورود طولانی‌تر از حد مجاز است.');
      return;
    }
    if (!online) {
      setValidationError('برای ورود اولیه، اتصال اینترنت را بررسی کنید.');
      return;
    }
    setValidationError('');
    setUsername(normalizedUsername);
    void login(normalizedUsername, password);
  }

  return (
    <main className="student-login" dir="rtl">
      <section className="student-login__intro" aria-labelledby="student-login-title">
        <span className="student-login__brand" aria-hidden="true"><GraduationCap /></span>
        <div>
          <p>مشاور همراه</p>
          <h1 id="student-login-title">برنامه‌ریزی آرام، پیشرفت پیوسته</h1>
          <span>برنامه امروز، آزمون‌ها و گفت‌وگو با تیم آموزشی در فضای شخصی شما.</span>
        </div>
        <ul aria-label="ویژگی‌های ورود امن">
          <li><ShieldCheck aria-hidden="true" /> نشست امن و دسترسی متناسب با نقش</li>
          <li><LockKeyhole aria-hidden="true" /> رمز عبور فقط به API امن ارسال می‌شود</li>
        </ul>
      </section>

      <div className="student-login__account-tabs" role="tablist" aria-label="ورود یا ساخت حساب">
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>ورود</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')}>ساخت حساب</button>
      </div>
      {mode === 'signup' ? <SignupForm onLogin={() => setMode('login')} /> : <form className="student-login__card" onSubmit={submit} aria-busy={isLoading} noValidate>
        <header>
          <span><LogIn aria-hidden="true" /></span>
          <div>
            <h2>ورود به حساب</h2>
            <p>ویژه دانش‌آموزان و اعضای خانواده</p>
          </div>
        </header>

        {!online ? <p className="student-login__offline" role="status"><WifiOff aria-hidden="true" /> اینترنت در دسترس نیست</p> : null}

        <label htmlFor={usernameId}>نام کاربری</label>
        <div className="student-login__field">
          <UserRound aria-hidden="true" />
          <input
            id={usernameId}
            dir="ltr"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            inputMode="text"
            maxLength={120}
            value={username}
            disabled={isLoading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setUsername(event.target.value);
              if (validationError) setValidationError('');
            }}
          />
        </div>

        <PasswordInput label="رمز عبور" value={password} autoComplete="current-password" disabled={isLoading} invalid={Boolean(error)} describedBy={error ? errorId : undefined} onChange={(value) => { setPassword(value); if (validationError) setValidationError(''); }} />

        {error ? <p id={errorId} className="student-login__error" role="alert">{error}</p> : null}

        <button className="student-login__submit" type="submit" disabled={isLoading || !online}>
          {isLoading ? <LoaderCircle className="spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
          <span>{isLoading ? 'در حال بررسی حساب…' : 'ورود امن'}</span>
        </button>
        <small>اگر اطلاعات ورود را ندارید، با مدیر مرکز یا مشاور خود تماس بگیرید.</small>
      </form>}
    </main>
  );
}
