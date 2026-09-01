import { LearningPage } from './features/learning/LearningPage';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { NavLink, Route, Routes, BrowserRouter } from 'react-router-dom';
import { CalendarDays, GraduationCap, Home, LogIn, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useStudentStore } from './services/student-store';
import { apiClient } from './services/api-client';
import { TauriSQLiteProvider } from './native/tauri-sqlite-provider';
import { SQLiteSyncProvider } from './sync/sqlite-sync-provider';
import { WebSyncProvider } from './sync/sync-status';
import { SyncWorker } from '@moshaver/student-core';
import { registerWebUpdateAdapter } from './pwa/web-update-adapter';
import { registerNotificationClickHandler } from './services/notification-service';
import { HomePage } from './features/home/HomePage';
import { PlanPage } from './features/plan/PlanPage';
import { ExamPage } from './features/exam/ExamPage';
import { ChatPage } from './features/chat/ChatPage';
import { MorePage } from './features/more/MorePage';
import './styles.css';

function App() {
  const syncStatus = useStudentStore((state) => state.syncStatus);
  const authStatus = useStudentStore((state) => state.authStatus);
  const restoreSession = useStudentStore((state) => state.restoreSession);
  const [online, setOnline] = useState(navigator.onLine);
  const [reconnected, setReconnected] = useState(false);

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
        <header className="sticky top-0 z-10 border-b border-black/10 bg-paper/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div>
              <strong className="block text-base">Moshaver | مشاور</strong>
              <span className="text-xs text-ink/65">نسخه چندسکویی دانش‌آموز</span>
            </div>
            <span className="rounded-full bg-mint/15 px-3 py-1 text-xs text-mint">{syncStatusLabel(syncStatus)}</span>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/more" element={<MorePage />} />
                      <Route path="/learning" element={<LearningPage />} />
          </Routes>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">
          <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
            <Tab to="/" icon={<Home />} label="خانه" />
            <Tab to="/plan" icon={<CalendarDays />} label="برنامه" />
            <Tab to="/exam" icon={<GraduationCap />} label="آزمون" />
            <Tab to="/chat" icon={<MessageCircle />} label="مشاور" />
            <Tab to="/more" icon={<MoreHorizontal />} label="بیشتر" />
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
  const worker = new SyncWorker(syncProvider, apiClient, () => navigator.onLine);
  apiClient.configureSync(syncProvider);
  worker.subscribe((status) => useStudentStore.getState().setSyncStatus(status));
  const onOnline = () => void worker.flush();
  const onOffline = () => worker.setOffline();
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  worker.start();
  return () => {
    worker.stop();
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
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
          <strong className="block text-lg">ورود دانش‌آموز</strong>
          <span className="text-sm text-ink/60">اتصال امن به نسخه backend-v2</span>
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

function Tab({ to, icon, label }: { to: string; icon: React.ReactElement; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-14 flex-col items-center justify-center rounded-md text-xs ${
          isActive ? 'bg-ink text-white' : 'text-ink/65'
        }`
      }
    >
      {React.cloneElement(icon, { size: 20, strokeWidth: 2 })}
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

void initializeSync().then(() => {
  registerWebUpdateAdapter();
  registerNotificationClickHandler();
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
