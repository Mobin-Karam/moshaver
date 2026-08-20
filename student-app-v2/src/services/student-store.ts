import { create } from 'zustand';
import { useMemo } from 'react';
import {
  currentAndNextTask,
  planMetrics,
  type ActiveStudySession,
  type ExamSummary,
  type StudentPlan,
  type StudentTask,
  type SyncStatus,
} from '@moshaver/student-core';
import { apiClient } from './api-client';

type AuthStatus = 'checking' | 'anonymous' | 'authenticated';
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

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

interface StudentState {
  authStatus: AuthStatus;
  loadStatus: LoadStatus;
  syncStatus: SyncStatus;
  user: BackendUser | null;
  student: BackendStudent | null;
  plan: StudentPlan;
  exams: ExamSummary[];
  activeSession: ActiveStudySession | null;
  error: string | null;
  restoreSession(): Promise<void>;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadDashboard(): Promise<void>;
  loadPlan(date: string): Promise<void>;
  loadExams(): Promise<void>;
  completeTask(taskId: string): Promise<void>;
}

const emptyPlan = (): StudentPlan => ({
  isoDate: new Date().toISOString().slice(0, 10),
  title: 'برنامه امروز',
  motivationText: '',
  tasks: [],
});

export const useStudentStore = create<StudentState>((set, get) => ({
  authStatus: 'checking',
  loadStatus: 'idle',
  syncStatus: navigator.onLine ? 'online' : 'offline',
  activeSession: null,
  user: null,
  student: null,
  exams: [],
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
    } catch (error) {
      set({ loadStatus: 'error', error: readableError(error) });
    }
  },
  async logout() {
    set({ loadStatus: 'loading', error: null });
    await apiClient.request('POST', '/auth/logout').catch(() => undefined);
    apiClient.setCsrfToken(null);
    set({ authStatus: 'anonymous', loadStatus: 'idle', user: null, student: null, plan: emptyPlan(), exams: [], error: null });
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
          tasks: tasks.map(mapTask),
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
          tasks: tasks.map(mapTask),
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
  async completeTask(taskId) {
    const previousPlan = get().plan;
    set((state) => ({
      plan: {
        ...state.plan,
        tasks: state.plan.tasks.map((task) =>
          task.id === taskId
            ? { ...task, completion: { status: 'done', actualMinutes: plannedMinutesFromTask(task), actualTests: Number(task.testCount ?? 0) } }
            : task,
        ),
      },
    }));
    try {
      await apiClient.request('POST', `/student/tasks/${taskId}/complete`);
      await get().loadDashboard();
    } catch (error) {
      set({ plan: previousPlan, error: readableError(error), syncStatus: navigator.onLine ? 'failed' : 'offline' });
    }
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

function plannedMinutesFromTask(task: StudentTask) {
  const [startHour = '0', startMinute = '0'] = task.start.split(':');
  const [endHour = '0', endMinute = '0'] = task.end.split(':');
  return Math.max(0, Number(endHour) * 60 + Number(endMinute) - (Number(startHour) * 60 + Number(startMinute)));
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'درخواست ناموفق بود.';
}
