import { create } from 'zustand';
import { useMemo } from 'react';
import {
  createTaskCompletionPayload,
  currentAndNextTask,
  planMetrics,
  type ActiveStudySession,
  type ExamSummary,
  type StudentPlan,
  type StudentTask,
  type TaskCompletionStatus,
  type SyncStatus,
  sortStudentTasks,
} from '@moshaver/student-core';
import { apiClient } from './api-client';
import { notifyNewNotifications } from './notification-service';

type AuthStatus = 'checking' | 'anonymous' | 'authenticated';
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type FocusStatus = 'running' | 'paused';

interface FocusSession extends ActiveStudySession {
  status: FocusStatus;
  elapsedSeconds: number;
}

interface BackendUser {
  id: string;
  username: string;
  role: string;
  csrfToken?: string;
}

interface BackendStudent {
  id: string;
  name: string;
  grade?: string;
  major?: string;
  targetUniversity?: string;
  targetField?: string;
  targetRank?: string;
  dailyCapacity?: string;
}

interface BackendTask {
  id: string;
  type?: string;
  title?: string;
  subject?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  testCount?: number;
  note?: string;
  priority?: number;
  completedAt?: string | null;
}

interface BackendPlan {
  id?: string;
  date?: string;
  tasks?: BackendTask[];
}

interface BackendDashboard {
  student?: BackendStudent | null;
  plan?: BackendPlan | null;
  tasks?: BackendTask[];
  recommendations?: unknown[];
}

interface BackendExam {
  id: string;
  title: string;
  duration?: number;
  attemptLimit?: number;
  startTime?: string | null;
  endTime?: string | null;
  questions?: unknown[];
}

interface BackendStudySession {
  id: string;
  taskId?: string;
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  startedAt: string;
  elapsedSeconds?: number;
}

export interface StudentProgress {
  studentId: string | null;
  completed: number;
  total: number;
  percent: number;
}

export interface StudentReviewItem {
  id?: string;
  title?: string;
  subject?: string;
  status?: string;
  dueAt?: string;
  note?: string;
}

export interface StudentNotification {
  id: string;
  type?: string;
  title: string;
  message: string;
  readAt?: string | null;
}

export interface AuthSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface NightReportDraft {
  sleepHours: string;
  studyMinutes: string;
  mood: string;
  note: string;
  savedAt: string;
}

export interface RecoveryRequestDraft {
  date: string;
  reason: string;
  details: string;
  savedAt: string;
}

interface StudentState {
  authStatus: AuthStatus;
  loadStatus: LoadStatus;
  syncStatus: SyncStatus;
  setSyncStatus(status: SyncStatus): void;
  user: BackendUser | null;
  student: BackendStudent | null;
  plan: StudentPlan;
  exams: ExamSummary[];
  notifications: StudentNotification[];
    progress: StudentProgress | null;
    reviews: StudentReviewItem[];
    learningLoadStatus: LoadStatus;
    learningError: string | null;
  authSessions: AuthSession[];
  nightReportDraft: NightReportDraft | null;
  recoveryRequestDraft: RecoveryRequestDraft | null;
  activeSession: FocusSession | null;
  error: string | null;
  restoreSession(): Promise<void>;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadDashboard(): Promise<void>;
  loadPlan(date: string): Promise<void>;
  loadExams(): Promise<void>;
  loadNotifications(): Promise<void>;
    loadLearning(): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  loadAuthSessions(): Promise<void>;
  revokeAuthSession(id: string): Promise<void>;
  saveNightReportDraft(draft: Omit<NightReportDraft, 'savedAt'>): Promise<void>;
  saveRecoveryRequestDraft(draft: Omit<RecoveryRequestDraft, 'savedAt'>): Promise<void>;
  submitNightReport(draft: Omit<NightReportDraft, 'savedAt'>): Promise<void>;
  submitRecoveryRequest(draft: Omit<RecoveryRequestDraft, 'savedAt'>): Promise<void>;
  restoreActiveSession(): Promise<void>;
  startTask(taskId: string): Promise<void>;
  pauseFocus(): Promise<void>;
  resumeFocus(): Promise<void>;
  finishTask(taskId: string, feedback?: { status?: TaskCompletionStatus; actualTests?: number; difficulty?: string; note?: string }): Promise<void>;
  completeTask(taskId: string): Promise<void>;
  cancelFocus(): void;
}

const emptyPlan = (): StudentPlan => ({
  isoDate: new Date().toISOString().slice(0, 10),
  title: 'برنامه امروز',
  motivationText: '',
  tasks: [],
});

const FOCUS_SESSION_KEY = 'moshaver_v2_active_focus';
const NIGHT_REPORT_DRAFT_KEY = 'moshaver_v2_night_report_draft';
const RECOVERY_REQUEST_DRAFT_KEY = 'moshaver_v2_recovery_request_draft';

function readFocusSession(): FocusSession | null {
  try {
    const value = localStorage.getItem(FOCUS_SESSION_KEY);
    return value ? (JSON.parse(value) as FocusSession) : null;
  } catch {
    return null;
  }
}

function saveFocusSession(session: FocusSession | null) {
  if (session) localStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(FOCUS_SESSION_KEY);
}

function readDraft<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function elapsedSeconds(session: FocusSession, now = Date.now()) {
  if (session.status === 'paused') return session.elapsedSeconds;
  return session.elapsedSeconds + Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));
}

export const useStudentStore = create<StudentState>((set, get) => ({
  authStatus: 'checking',
  loadStatus: 'idle',
  syncStatus: navigator.onLine ? 'online' : 'offline',
  setSyncStatus(status) {
    set({ syncStatus: status });
  },
  activeSession: readFocusSession(),
  user: null,
  student: null,
  exams: [],
  notifications: [],
    progress: null,
    reviews: [],
    learningLoadStatus: 'idle',
    learningError: null,
  authSessions: [],
  nightReportDraft: readDraft<NightReportDraft>(NIGHT_REPORT_DRAFT_KEY),
  recoveryRequestDraft: readDraft<RecoveryRequestDraft>(RECOVERY_REQUEST_DRAFT_KEY),
  plan: emptyPlan(),
  error: null,
  async restoreSession() {
    set({ authStatus: 'checking', error: null });
    try {
      const user = await apiClient.request<BackendUser>('GET', '/auth/me');
      apiClient.setCsrfToken(user.csrfToken);
      if (user.role !== 'STUDENT') {
        await apiClient.request('POST', '/auth/logout').catch(() => undefined);
        apiClient.setCsrfToken(null);
        set({ authStatus: 'anonymous', user: null, student: null, plan: emptyPlan(), error: 'این نسخه فقط برای دانش‌آموز است.' });
        return;
      }
      set({ authStatus: 'authenticated', user });
      await get().loadDashboard();
      await get().loadExams();
      await get().loadNotifications();
      await get().loadLearning();
      await get().restoreActiveSession();
    } catch {
      apiClient.setCsrfToken(null);
      set({ authStatus: 'anonymous', user: null, student: null, plan: emptyPlan() });
    }
  },
  async login(username, password) {
    set({ loadStatus: 'loading', error: null });
    try {
      const session = await apiClient.request<{ user: BackendUser; csrfToken: string; expiresAt: string }, { username: string; password: string }>(
        'POST',
        '/auth/login',
        { username, password },
      );
      apiClient.setCsrfToken(session.csrfToken);
      if (session.user.role !== 'STUDENT') {
        await apiClient.request('POST', '/auth/logout').catch(() => undefined);
        apiClient.setCsrfToken(null);
        set({ authStatus: 'anonymous', loadStatus: 'error', user: null, error: 'این حساب دانش‌آموز نیست.' });
        return;
      }
      set({ authStatus: 'authenticated', user: session.user, loadStatus: 'idle' });
      await get().loadDashboard();
      await get().loadExams();
      await get().loadNotifications();
      await get().loadLearning();
      await get().restoreActiveSession();
    } catch (error) {
      set({ loadStatus: 'error', error: readableError(error) });
    }
  },
  async logout() {
    set({ loadStatus: 'loading', error: null });
    await apiClient.request('POST', '/auth/logout').catch(() => undefined);
    apiClient.setCsrfToken(null);
    set({ authStatus: 'anonymous', loadStatus: 'idle', user: null, student: null, plan: emptyPlan(), exams: [], notifications: [], authSessions: [], error: null });
  },
  async loadDashboard() {
    set({ loadStatus: 'loading', error: null });
    try {
      const dashboard = await apiClient.request<BackendDashboard>('GET', '/student/dashboard');
      const tasks = dashboard.tasks ?? dashboard.plan?.tasks ?? [];
      set({
        loadStatus: 'ready',
        student: dashboard.student ?? null,
        plan: {
          id: dashboard.plan?.id,
          isoDate: dashboard.plan?.date ?? new Date().toISOString().slice(0, 10),
          title: 'برنامه امروز',
          motivationText: dashboard.recommendations?.length ? 'پیشنهادهای امروز آماده است.' : '',
          tasks: sortStudentTasks(tasks.map(mapTask)),
        },
      });
    } catch (error) {
      set({ loadStatus: 'error', error: readableError(error), plan: emptyPlan() });
    }
  },
  async loadPlan(date) {
    set({ loadStatus: 'loading', error: null });
    try {
      const plans = await apiClient.request<BackendPlan[]>('GET', `/student/plans?date=${encodeURIComponent(date)}`);
      const plan = plans[0] ?? null;
      const tasks = plan?.tasks ?? [];
      set({
        loadStatus: 'ready',
        plan: {
          id: plan?.id,
          isoDate: plan?.date ?? date,
          title: 'برنامه روزانه',
          tasks: sortStudentTasks(tasks.map(mapTask)),
        },
      });
    } catch (error) {
      set({ loadStatus: 'error', error: readableError(error), plan: { ...emptyPlan(), isoDate: date } });
    }
  },
  async loadExams() {
    try {
      const exams = await apiClient.request<BackendExam[]>('GET', '/student/exams');
      set({ exams: exams.map(mapExam) });
    } catch {
      set({ exams: [] });
    }
  },
  async loadNotifications() {
    try {
      const result = await apiClient.request<{ items: Array<{ id: string; type?: string; title: string; message: string; isRead?: boolean; readAt?: string | null }>; unreadCount: number }>('GET', '/notifications?limit=50');
      const notifications = result.items.map((notification) => ({ ...notification, readAt: notification.readAt ?? (notification.isRead ? new Date(0).toISOString() : null) }));
      set({ notifications });
      void notifyNewNotifications(notifications);
    } catch (error) {
      set({ notifications: [], error: readableError(error) });
    }
  },
  async loadLearning() {
    set({ learningLoadStatus: 'loading', learningError: null });
    try {
      const [progress, reviews] = await Promise.all([
        apiClient.request<StudentProgress>('GET', '/student/progress'),
        apiClient.request<{ studentId: string | null; items: StudentReviewItem[] }>('GET', '/student/reviews'),
      ]);
      set({ progress, reviews: reviews.items ?? [], learningLoadStatus: 'ready' });
    } catch (error) {
      set({ progress: null, reviews: [], learningLoadStatus: 'error', learningError: readableError(error) });
    }
  },
  async markNotificationRead(id) {
    await apiClient.request('PUT', `/notifications/${encodeURIComponent(id)}/read`);
    await get().loadNotifications();
  },
  async markAllNotificationsRead() {
    await apiClient.request('PUT', '/notifications/read-all');
    await get().loadNotifications();
  },
  async loadAuthSessions() {
    try {
      const sessions = await apiClient.request<AuthSession[]>('GET', '/auth/sessions');
      set({ authSessions: sessions });
    } catch (error) {
      set({ authSessions: [], error: readableError(error) });
    }
  },
  async revokeAuthSession(id) {
    await apiClient.request('DELETE', `/auth/sessions/${encodeURIComponent(id)}`);
    const session = get().authSessions.find((item) => item.id === id);
    if (session?.current) {
      await get().logout();
      return;
    }
    set((state) => ({ authSessions: state.authSessions.filter((item) => item.id !== id) }));
  },
  async saveNightReportDraft(draft) {
    const saved = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(NIGHT_REPORT_DRAFT_KEY, JSON.stringify(saved));
    set({ nightReportDraft: saved });
  },
  async saveRecoveryRequestDraft(draft) {
    const saved = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(RECOVERY_REQUEST_DRAFT_KEY, JSON.stringify(saved));
    set({ recoveryRequestDraft: saved });
  },
  async submitNightReport(draft) {
    await apiClient.request('POST', '/reports', {
      planDate: new Date().toISOString().slice(0, 10),
      focus: Math.max(0, Math.min(10, Number(draft.studyMinutes) ? Math.round(Math.min(10, Number(draft.studyMinutes) / 60)) : 0)),
      fatigue: Math.max(0, Math.min(10, Number(draft.sleepHours) ? Math.round(Math.max(0, 10 - Number(draft.sleepHours) / 2)) : 0)),
      motivation: draft.mood === 'خوب' ? 8 : draft.mood === 'معمولی' ? 5 : 3,
      problem: draft.note,
      tomorrow: '',
    });
    localStorage.removeItem(NIGHT_REPORT_DRAFT_KEY);
    set({ nightReportDraft: null });
  },
  async submitRecoveryRequest(draft) {
    await apiClient.request('POST', '/recovery-requests', { planDate: draft.date, reason: draft.reason, note: draft.details });
    localStorage.removeItem(RECOVERY_REQUEST_DRAFT_KEY);
    set({ recoveryRequestDraft: null });
  },
  async restoreActiveSession() {
    try {
      const session = await apiClient.request<BackendStudySession | null>('GET', '/student/study-sessions/active');
      if (session) {
        const restored = mapStudySession(session);
        saveFocusSession(restored);
        set({ activeSession: restored });
      }
    } catch {
      // A cached local session remains available when the server is unreachable.
    }
  },
  async startTask(taskId) {
    try {
      const current = get().activeSession;
      if (current?.taskId === taskId && current.status === 'paused') {
        const session = await apiClient.request<BackendStudySession>('POST', `/student/study-sessions/${current.id}/resume`);
        const resumed = mapStudySession(session);
        saveFocusSession(resumed);
        set({ activeSession: resumed, error: null });
        return;
      }
      if (current?.taskId === taskId && current.status === 'running') return;
      const session = await apiClient.request<BackendStudySession, { taskId: string }>('POST', '/student/study-sessions', { taskId });
      const next = mapStudySession(session);
      saveFocusSession(next);
      set({ activeSession: next, error: null });
    } catch (error) {
      set({ error: readableError(error), syncStatus: navigator.onLine ? 'failed' : 'offline' });
      throw error;
    }
  },
  async pauseFocus() {
    try {
      const current = get().activeSession;
      if (!current || current.status === 'paused' || current.id.startsWith('local-')) return;
      const session = await apiClient.request<BackendStudySession>('POST', `/student/study-sessions/${current.id}/pause`);
      const paused = mapStudySession(session);
      saveFocusSession(paused);
      set({ activeSession: paused, error: null });
    } catch (error) {
      set({ error: readableError(error), syncStatus: navigator.onLine ? 'failed' : 'offline' });
      throw error;
    }
  },
  async resumeFocus() {
    try {
      const current = get().activeSession;
      if (!current || current.status === 'running' || current.id.startsWith('local-')) return;
      const session = await apiClient.request<BackendStudySession>('POST', `/student/study-sessions/${current.id}/resume`);
      const resumed = mapStudySession(session);
      saveFocusSession(resumed);
      set({ activeSession: resumed, error: null });
    } catch (error) {
      set({ error: readableError(error), syncStatus: navigator.onLine ? 'failed' : 'offline' });
      throw error;
    }
  },
  async finishTask(taskId, feedback) {
    const previousPlan = get().plan;
    const task = previousPlan.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const session = get().activeSession?.taskId === taskId ? get().activeSession : null;
    const payload = createTaskCompletionPayload(task, feedback?.status || 'done', session?.startedAt ?? null);
    const completion = {
      ...payload,
      actualMinutes: session ? Math.max(1, Math.round(elapsedSeconds(session) / 60)) : payload.actualMinutes,
      actualTests: Number(feedback?.actualTests ?? payload.actualTests),
      note: [feedback?.difficulty ? `سختی: ${feedback.difficulty}` : '', feedback?.note || ''].filter(Boolean).join(' | '),
    };
    saveFocusSession(null);
    set((state) => ({
      activeSession: null,
      plan: {
        ...state.plan,
        tasks: state.plan.tasks.map((item) => item.id === taskId ? { ...item, completion } : item),
      },
    }));
    try {
      if (session && !session.id.startsWith('local-')) {
        await apiClient.request('POST', `/student/study-sessions/${session.id}/finish`, {
          actualTests: completion.actualTests,
          difficulty: feedback?.difficulty,
          note: feedback?.note,
        });
      }
      await apiClient.request('POST', `/student/tasks/${taskId}/complete`);
      await get().loadDashboard();
    } catch (error) {
      set({ plan: previousPlan, activeSession: null, error: readableError(error), syncStatus: navigator.onLine ? 'failed' : 'offline' });
      throw error;
    }
  },
  async completeTask(taskId) {
    await get().finishTask(taskId);
  },
  cancelFocus() {
    saveFocusSession(null);
    set({ activeSession: null });
  },
}));

export function useTodaySummary() {
  const tasks = useStudentStore((state) => state.plan.tasks);
  const activeSession = useStudentStore((state) => state.activeSession);

  return useMemo(() => {
    const metrics = planMetrics(tasks);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const current = currentAndNextTask(tasks, nowTime, activeSession);
    return { metrics, ...current };
  }, [activeSession, tasks]);
}

function mapTask(task: BackendTask, index: number): StudentTask {
  const startTime = task.startTime || formatTime(Number(task.priority ?? index) * 45);
  const endTime = task.endTime || formatTime(toMinutes(startTime) + Number(task.duration || 45));
  return {
    id: task.id,
    type: mapTaskType(task.type),
    title: task.title || 'فعالیت',
    subject: task.subject || '',
    start: startTime,
    end: endTime,
    testCount: Number(task.testCount || 0),
    note: task.note || task.description || undefined,
    completion: task.completedAt ? { status: 'done', actualMinutes: Number(task.duration || 0), actualTests: Number(task.testCount || 0) } : null,
  };
}

function mapTaskType(type?: string): StudentTask['type'] {
  const normalized = (type || '').toLowerCase();
  if (normalized === 'study' || normalized === 'review' || normalized === 'test' || normalized === 'exam') return normalized;
  if (normalized === 'rest') return 'break';
  return 'study';
}

function mapExam(exam: BackendExam): ExamSummary {
  return {
    id: exam.id,
    title: exam.title,
    openAt: exam.startTime ?? undefined,
    closeAt: exam.endTime ?? undefined,
    durationMinutes: exam.duration,
    maxAttempts: exam.attemptLimit,
    delivery: {
      canStart: true,
      allowedAttempts: exam.attemptLimit,
      questionCount: exam.questions?.length ?? 0,
    },
  };
}

function mapStudySession(session: BackendStudySession): FocusSession {
  return {
    id: session.id,
    taskId: session.taskId || '',
    startedAt: session.startedAt,
    status: session.status === 'PAUSED' ? 'paused' : 'running',
    elapsedSeconds: Number(session.elapsedSeconds || 0),
  };
}

function formatTime(minutes: number) {
  const dayMinutes = ((minutes % 1440) + 1440) % 1440;
  const hour = String(Math.floor(dayMinutes / 60)).padStart(2, '0');
  const minute = String(dayMinutes % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function toMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'درخواست ناموفق بود.';
}
