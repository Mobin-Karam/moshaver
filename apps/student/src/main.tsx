import { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom';
import { useStudentStore } from './services/student-store';
import { apiClient } from './services/api-client';
import { TauriSQLiteProvider } from './native/tauri-sqlite-provider';
import { SQLiteSyncProvider } from './sync/sqlite-sync-provider';
import { WebSyncProvider } from './sync/sync-status';
import { pullChanges, SyncWorker } from '@moshaver/student-core';
import { registerWebUpdateAdapter } from './pwa/web-update-adapter';
import { registerNotificationClickHandler } from './services/notification-service';
import { StudentAppShell } from './components/layout/StudentAppShell';
import { LoadingState } from './components/ui';
import { LoginPage } from './features/auth/LoginPage';
import './styles.css';

const HomePage = lazy(() => import('./features/home/HomePage').then((module) => ({ default: module.HomePage })));
const PlanPage = lazy(() => import('./features/plan/PlanPage').then((module) => ({ default: module.PlanPage })));
const ExamPage = lazy(() => import('./features/exam/ExamPage').then((module) => ({ default: module.ExamPage })));
const ChatPage = lazy(() => import('./features/chat/ChatPage').then((module) => ({ default: module.ChatPage })));
const MoreRouterPage = lazy(() => import('./features/more/MoreRouterPage').then((module) => ({ default: module.MoreRouterPage })));
const LazyLearningPage = lazy(() => import('./features/learning/LearningPage').then((module) => ({ default: module.LearningPage })));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const LearningResourcesPage = lazy(() => import('./features/resources/LearningResourcesPage').then((module) => ({ default: module.LearningResourcesPage })));
const StudentQuizzesPage = lazy(() => import('./features/quiz/StudentQuizzesPage').then((module) => ({ default: module.StudentQuizzesPage })));

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
      <div className="min-h-screen bg-paper text-ink" dir="rtl">
        {!online ? <div className="bg-red-700 px-4 py-2 text-center text-sm text-white" role="status">اتصال اینترنت قطع است؛ تغییرات روی دستگاه ذخیره می‌شوند.</div> : null}
        {online && reconnected ? <div className="bg-mint px-4 py-2 text-center text-sm text-white" role="status">اتصال اینترنت برقرار شد.</div> : null}
        <StudentAppShell access={access} unread={unread} syncLabel={syncStatusLabel(syncStatus)} theme={theme} onThemeChange={() => setTheme((value) => value === 'light' ? 'dark' : value === 'dark' ? 'system' : 'light')} guardianSelector={access?.mode === 'guardian' && guardianStudents.length ? <label className="guardian-picker"><span>فرزند:</span><select value={selectedGuardianStudentId || ''} onChange={(event) => void selectGuardianStudent(event.target.value)}>{guardianStudents.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label> : undefined}>
          <Suspense fallback={<LoadingState label="در حال آماده‌سازی صفحه" />}><Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plan" element={access?.canReadPlans ? <PlanPage /> : <Navigate to="/" replace />} />
            <Route path="/exam" element={access?.canReadExams ? <ExamPage /> : <Navigate to="/" replace />} />
            <Route path="/chat" element={access?.canUseChat ? <ChatPage /> : <Navigate to="/" replace />} />
            <Route path="/more/:section?" element={<MoreRouterPage theme={theme} onThemeChange={setTheme} />} />
            <Route path="/learning" element={access?.canReadLearning ? <LazyLearningPage /> : <Navigate to="/more" replace />} />
            <Route path="/resources" element={access?.canReadResources ? <LearningResourcesPage /> : <Navigate to="/more" replace />} />
            <Route path="/quizzes" element={access?.canUseQuizzes ? <StudentQuizzesPage /> : <Navigate to="/more" replace />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes></Suspense>
        </StudentAppShell>
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

function syncStatusLabel(status: string) {
  if (status === 'offline') return 'آفلاین';
  if (status === 'syncing') return 'در حال همگام‌سازی';
  if (status === 'failed') return 'خطای همگام‌سازی';
  return 'آنلاین';
}

void syncController.then(() => {
  registerWebUpdateAdapter();
  registerNotificationClickHandler();
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
