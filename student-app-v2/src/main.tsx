import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { NavLink, Route, Routes, BrowserRouter } from 'react-router-dom';
import { CalendarDays, GraduationCap, Home, Laptop, LogIn, MessageCircle, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { useStudentStore } from './services/student-store';
import { apiClient } from './services/api-client';
import { TauriSQLiteProvider } from './native/tauri-sqlite-provider';
import { SQLiteSyncProvider } from './sync/sqlite-sync-provider';
import { WebSyncProvider } from './sync/sync-status';
import { pullChanges, SyncWorker } from '@moshaver/student-core';
import { registerWebUpdateAdapter } from './pwa/web-update-adapter';
import { registerNotificationClickHandler } from './services/notification-service';
import './styles.css';

const HomePage = lazy(() => import('./features/home/HomePage').then((module) => ({ default: module.HomePage })));
const PlanPage = lazy(() => import('./features/plan/PlanPage').then((module) => ({ default: module.PlanPage })));
const ExamPage = lazy(() => import('./features/exam/ExamPage').then((module) => ({ default: module.ExamPage })));
const ChatPage = lazy(() => import('./features/chat/ChatPage').then((module) => ({ default: module.ChatPage })));
const MorePage = lazy(() => import('./features/more/MorePage').then((module) => ({ default: module.MorePage })));
const LazyLearningPage = lazy(() => import('./features/learning/LearningPage').then((module) => ({ default: module.LearningPage })));

const syncController = initializeSync();

function App() {
  const syncStatus = useStudentStore((state) => state.syncStatus);
  const authStatus = useStudentStore((state) => state.authStatus);
  const restoreSession = useStudentStore((state) => state.restoreSession);
  const access = useStudentStore((state) => state.access);
  const guardianStudents = useStudentStore((state) => state.guardianStudents);
  const selectedGuardianStudentId = useStudentStore((state) => state.selectedGuardianStudentId);
  const selectGuardianStudent = useStudentStore((state) => state.selectGuardianStudent);
  const unread = useStudentStore((state) => state.notifications.filter((item) => !item.readAt).length);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('moshaver:v2:theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const [online, setOnline] = useState(navigator.onLine);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply();
    media.addEventListener('change', apply);
    localStorage.setItem('moshaver:v2:theme', theme);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setReconnected(true);
      window.setTimeout(() => setReconnected(false), 3000);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || access?.mode !== 'student') return;
    const source = apiClient.openEvents((type) => {
      window.dispatchEvent(new CustomEvent('moshaver:v2-event', { detail: { type } }));
      const state = useStudentStore.getState();
      if (type.startsWith('notification.')) void state.loadNotifications();
      if (type.startsWith('plan.') || type.startsWith('task.')) void state.loadDashboard();
      if (type.startsWith('exam.')) void state.loadExams();
      if (type.startsWith('learning.') || type.startsWith('relationship.')) void Promise.all([state.loadLearning(), state.loadProfileDomains()]);
    });
    return () => source.close();
  }, [access?.mode, authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || access?.mode !== 'student') return;
    let active = true;
    void syncController.then((controller) => { if (active) controller.start(); });
    return () => { active = false; void syncController.then((controller) => controller.stop()); };
  }, [access?.mode, authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || access?.mode !== 'student') return;
    const heartbeat = () => void apiClient.request('PUT', '/student/presence/heartbeat', { state: document.hidden ? 'idle' : 'active' }).catch(() => undefined);
    heartbeat();
    const interval = window.setInterval(heartbeat, 45_000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [access?.mode, authStatus]);

  if (authStatus === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-4 text-ink" dir="rtl">
        <div className="surface w-full max-w-sm p-5 text-center">
          <strong className="block">در حال بررسی نشست</strong>
          <span className="mt-2 block text-sm text-ink/60">اتصال به backend-v2</span>
        </div>
      </div>
    );
  }

  if (authStatus === 'anonymous') {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-paper text-ink">
        {!online ? <div className="bg-red-700 px-4 py-2 text-center text-sm text-white" role="status">اتصال اینترنت قطع است؛ تغییرات روی دستگاه ذخیره می‌شوند.</div> : null}
        {online && reconnected ? <div className="bg-mint px-4 py-2 text-center text-sm text-white" role="status">اتصال اینترنت برقرار شد.</div> : null}
        <header className="sticky top-0 z-20 border-b border-black/10 bg-paper/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div>
              <strong className="block text-base">Moshaver | مشاور</strong>
              <span className="text-xs text-ink/65 dark:text-white/60">{access?.mode === 'guardian' ? 'پرتال خانواده · فقط خواندنی' : 'همراه مطالعه و آزمون'}</span>
            </div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-mint/15 px-3 py-1 text-xs text-mint">{syncStatusLabel(syncStatus)}</span><button className="grid size-10 place-items-center rounded-xl bg-white text-ink shadow-sm dark:bg-slate-800 dark:text-white" aria-label={`پوسته ${themeLabel(theme)}؛ تغییر پوسته`} title={`پوسته ${themeLabel(theme)}`} onClick={() => setTheme((value) => value === 'light' ? 'dark' : value === 'dark' ? 'system' : 'light')}>{theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Laptop size={18} />}</button></div>
          </div>
          {access?.mode === 'guardian' && guardianStudents.length ? <label className="mx-auto mt-3 flex max-w-3xl items-center gap-2 text-xs font-bold"><span>فرزند:</span><select className="min-h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-slate-900" value={selectedGuardianStudentId || ''} onChange={(event) => void selectGuardianStudent(event.target.value)}>{guardianStudents.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label> : null}
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
          <Suspense fallback={<p className="surface p-4 text-sm text-ink/60">در حال آماده‌سازی صفحه…</p>}><Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/learning" element={<LazyLearningPage />} />
          </Routes></Suspense>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">
          <div className={`mx-auto grid max-w-3xl gap-1 ${access?.canUseChat ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <Tab to="/" icon={<Home />} label="امروز" />
            <Tab to="/plan" icon={<CalendarDays />} label="برنامه" />
            <Tab to="/exam" icon={<GraduationCap />} label="آزمون‌ها" />
            {access?.canUseChat ? <Tab to="/chat" icon={<MessageCircle />} label="گفتگو" /> : null}
            <Tab to="/more" icon={<MoreHorizontal />} label="بیشتر" badge={unread} />
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}

async function initializeSync() {
  const syncProvider = '__TAURI_INTERNALS__' in window
    ? new SQLiteSyncProvider(await new TauriSQLiteProvider().raw())
    : new WebSyncProvider();
  const reconcile = async () => {
    await pullChanges(syncProvider, apiClient, async () => {
      const state = useStudentStore.getState();
      if (state.authStatus !== 'authenticated') return;
      await Promise.all([state.loadDashboard(), state.loadPlan(new Date().toISOString().slice(0, 10)), state.loadExams(), state.loadNotifications(), state.loadLearning()]);
    });
  };
  const worker = new SyncWorker(syncProvider, apiClient, () => navigator.onLine, reconcile);
  apiClient.configureSync(syncProvider);
  worker.subscribe((status) => useStudentStore.getState().setSyncStatus(status));
  const onOnline = () => void worker.flush();
  const onOffline = () => worker.setOffline();
  let started = false;
  return {
    start() {
      if (started) return;
      started = true;
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      worker.start();
    },
    stop() {
      if (!started) return;
      started = false;
      worker.stop();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    },
  };
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useStudentStore((state) => state.login);
  const loadStatus = useStudentStore((state) => state.loadStatus);
  const error = useStudentStore((state) => state.error);
  const isLoading = loadStatus === 'loading';

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 text-ink" dir="rtl">
      <form
        className="surface w-full max-w-sm space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void login(username, password);
        }}
      >
        <div>
          <strong className="block text-lg">ورود دانش‌آموز یا خانواده</strong>
          <span className="text-sm text-ink/60">ورود امن به فضای شخصی یادگیری</span>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-ink/70">نام کاربری</span>
          <input
            className="w-full rounded-md border border-black/10 bg-white px-3 py-3 outline-none focus:border-ink"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-ink/70">رمز عبور</span>
          <input
            className="w-full rounded-md border border-black/10 bg-white px-3 py-3 outline-none focus:border-ink"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-white disabled:opacity-60" disabled={isLoading}>
          <LogIn size={18} />
          {isLoading ? 'در حال ورود' : 'ورود'}
        </button>
      </form>
    </div>
  );
}

function Tab({ to, icon, label, badge = 0 }: { to: string; icon: React.ReactElement; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-14 flex-col items-center justify-center rounded-md text-xs ${
          isActive ? 'bg-ink text-white' : 'text-ink/65'
        }`
      }
    >
      <span className="relative">{React.cloneElement(icon, { size: 20, strokeWidth: 2 })}{badge ? <span className="absolute -left-2 -top-2 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] text-white">{new Intl.NumberFormat('fa-IR').format(badge)}</span> : null}</span>
      <span className="mt-1">{label}</span>
    </NavLink>
  );
}

function syncStatusLabel(status: string) {
  if (status === 'offline') return 'آفلاین';
  if (status === 'syncing') return 'در حال همگام‌سازی';
  if (status === 'failed') return 'خطای همگام‌سازی';
  return 'آنلاین';
}

function themeLabel(theme: 'light' | 'dark' | 'system') {
  if (theme === 'light') return 'روشن';
  if (theme === 'dark') return 'تاریک';
  return 'سیستم';
}

void syncController.then(() => {
  registerWebUpdateAdapter();
  registerNotificationClickHandler();
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
