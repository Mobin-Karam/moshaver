import { beforeEach, describe, expect, it, vi } from 'vitest';
import { portalAccess } from '../app/portal-access';
import { apiClient } from './api-client';
import { useStudentStore } from './student-store';

const access = portalAccess(['STUDENT'], ['student.profile.read', 'tasks.update', 'learning.create', 'exams.read']);

describe('student task completion', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useStudentStore.setState({
      access,
      error: null,
      syncStatus: 'online',
      activeSession: null,
      plan: {
        isoDate: '2026-09-10',
        title: 'برنامه',
        tasks: [{ id: 'task/1', type: 'study', subject: 'ریاضی', start: '10:00', end: '11:00', testCount: 20 }],
      },
    } as never);
  });

  it('persists a task before finishing its paused timer session', async () => {
    useStudentStore.setState({
      activeSession: {
        id: 'session/1',
        taskId: 'task/1',
        startedAt: new Date().toISOString(),
        elapsedSeconds: 125,
        status: 'paused',
      },
    });
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async (_method, path) => {
      if (path === '/student/dashboard') return { tasks: [] } as never;
      return {} as never;
    });

    await useStudentStore.getState().finishTask('task/1', {
      status: 'done',
      actualTests: 12,
      difficulty: 'متوسط',
      note: 'تکمیل شد',
    });

    expect(request.mock.calls.slice(0, 2).map((call) => call[1])).toEqual([
      '/student/tasks/task%2F1/complete',
      '/student/study-sessions/session%2F1/finish',
    ]);
    expect(request.mock.calls[0][2]).toMatchObject({
      actualMinutes: 2,
      actualTests: 12,
      difficulty: 'متوسط',
      note: 'تکمیل شد',
    });
  });

  it('keeps a durable completion when ancillary timer finalization fails', async () => {
    useStudentStore.setState({
      activeSession: {
        id: 'session-1',
        taskId: 'task/1',
        startedAt: new Date().toISOString(),
        elapsedSeconds: 60,
        status: 'paused',
      },
    });
    vi.spyOn(apiClient, 'request').mockImplementation(async (_method, path) => {
      if (path.includes('/study-sessions/')) throw new Error('timer finish failed');
      if (path === '/student/dashboard') {
        return {
          tasks: [{
            id: 'task/1',
            type: 'study',
            subject: 'ریاضی',
            startTime: '10:00',
            endTime: '11:00',
            testCount: 20,
            completedAt: new Date().toISOString(),
            status: 'done',
          }],
        } as never;
      }
      return {} as never;
    });

    await expect(useStudentStore.getState().finishTask('task/1')).resolves.toBeUndefined();
    expect(useStudentStore.getState().activeSession).toBeNull();
    expect(useStudentStore.getState().plan.tasks[0].completion?.status).toBe('done');
  });

  it('re-anchors a running timer to the server heartbeat without double counting', async () => {
    const heartbeatAt = new Date().toISOString();
    useStudentStore.setState({ activeSession: { id: 'session-1', taskId: 'task/1', startedAt: '2026-09-10T08:00:00.000Z', elapsedSeconds: 1_800, status: 'running' } });
    vi.spyOn(apiClient, 'request').mockResolvedValue({ id: 'session-1', taskId: 'task/1', status: 'ACTIVE', startedAt: '2026-09-10T08:00:00.000Z', lastHeartbeatAt: heartbeatAt, elapsedSeconds: 1_830 } as never);

    await useStudentStore.getState().heartbeatFocus();

    expect(useStudentStore.getState().activeSession).toMatchObject({ startedAt: heartbeatAt, elapsedSeconds: 1_830, status: 'running' });
  });
});

describe('student account isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('clears all prior account state when session restoration fails', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    localStorage.setItem('moshaver_v2_active_focus', JSON.stringify({ id: 'old-session' }));
    localStorage.setItem('moshaver_v2_night_report_draft', JSON.stringify({ note: 'private' }));
    localStorage.setItem('moshaver_v2_recovery_request_draft', JSON.stringify({ details: 'private' }));
    localStorage.setItem('moshaver:v2:guardian-child', 'old-child');
    useStudentStore.setState({
      authStatus: 'authenticated',
      user: { id: 'old-user', username: 'old', role: 'STUDENT' },
      access,
      capabilities: ['student.profile.read'],
      student: { id: 'old-student', name: 'Old Student' },
      notifications: [{ id: 'private', title: 'Private', message: 'Private' }],
      activeSession: { id: 'old-session', status: 'paused', startedAt: new Date().toISOString(), elapsedSeconds: 1 },
    } as never);
    vi.spyOn(apiClient, 'request').mockRejectedValue(new Error('expired'));

    await useStudentStore.getState().restoreSession();

    expect(useStudentStore.getState()).toMatchObject({
      authStatus: 'anonymous',
      user: null,
      access: null,
      student: null,
      notifications: [],
      activeSession: null,
      capabilities: [],
    });
    expect(localStorage.getItem('moshaver_v2_active_focus')).toBeNull();
    expect(localStorage.getItem('moshaver_v2_night_report_draft')).toBeNull();
    expect(localStorage.getItem('moshaver_v2_recovery_request_draft')).toBeNull();
    expect(localStorage.getItem('moshaver:v2:guardian-child')).toBeNull();
  });

  it('revokes a newly-created session when loading its account context fails', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    localStorage.setItem('moshaver_v2_night_report_draft', JSON.stringify({ note: 'private' }));
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async (_method, path, body) => {
      if (path === '/auth/login') {
        expect(body).toEqual({ username: 'student.one', password: 'secret' });
        return { user: { id: 'user-1', username: 'student.one', role: 'STUDENT' }, csrfToken: 'csrf', expiresAt: new Date().toISOString() } as never;
      }
      if (path === '/me/context') throw new Error('context unavailable');
      if (path === '/auth/logout') return {} as never;
      throw new Error(`Unexpected request: ${path}`);
    });

    await useStudentStore.getState().login('  student.one  ', 'secret');

    expect(request.mock.calls.map((call) => call[1])).toEqual(['/auth/login', '/me/context', '/auth/logout']);
    expect(apiClient.getCsrfToken()).toBeNull();
    expect(useStudentStore.getState()).toMatchObject({
      authStatus: 'anonymous',
      loadStatus: 'error',
      user: null,
      access: null,
      error: 'context unavailable',
    });
    expect(localStorage.getItem('moshaver_v2_night_report_draft')).toBeNull();
  });

  it('shows network failures while restoring without retaining account data', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const networkError = new Error('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
    networkError.name = 'NETWORK';
    vi.spyOn(apiClient, 'request').mockRejectedValue(networkError);

    await useStudentStore.getState().restoreSession();

    expect(useStudentStore.getState()).toMatchObject({
      authStatus: 'anonymous',
      user: null,
      error: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.',
    });
  });

  it('does not bootstrap education APIs hidden by the active capabilities', async () => {
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async (_method, path) => {
      if (path === '/auth/me') return { id: 'user-1', username: 'readonly', role: 'STUDENT', csrfToken: 'csrf' } as never;
      if (path === '/me/context') return { user: { id: 'user-1' }, roles: ['STUDENT'], capabilities: ['student.profile.read', 'plans.read'] } as never;
      if (path === '/students/me') return { id: 'student-1', name: 'Read Only' } as never;
      if (path === '/relationships' || path === '/student/mistakes') return [] as never;
      if (path === '/student/dashboard') return { student: { id: 'student-1', name: 'Read Only' }, tasks: [] } as never;
      if (path === '/notifications?limit=50') return { items: [], unreadCount: 0 } as never;
      throw new Error(`Unexpected request: ${path}`);
    });

    await useStudentStore.getState().restoreSession();

    expect(useStudentStore.getState().authStatus).toBe('authenticated');
    expect(request.mock.calls.map((call) => call[1])).toEqual([
      '/auth/me',
      '/me/context',
      '/students/me',
      '/relationships',
      '/student/mistakes',
      '/student/dashboard',
      '/notifications?limit=50',
    ]);
    expect(request).not.toHaveBeenCalledWith('GET', '/student/exams');
    expect(request).not.toHaveBeenCalledWith('GET', '/student/progress');
  });
});

describe('guardian education projections', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useStudentStore.setState({
      access: portalAccess(['GUARDIAN'], ['guardian.students.read', 'studentSubjects.read']),
      guardianStudents: [],
      selectedGuardianStudentId: null,
      subjects: [],
    } as never);
  });

  it('loads subject settings for the selected related student', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([{ id: 'student/1', name: 'سارا' }] as never)
      .mockResolvedValueOnce([{ subject: { id: 'subject-1', code: 'math', name: 'ریاضی' }, enabled: true, displayName: 'ریاضی پایه', weeklyTargetMinutes: 240 }] as never);

    await useStudentStore.getState().loadProfileDomains();

    expect(request).toHaveBeenNthCalledWith(1, 'GET', '/guardian/students');
    expect(request).toHaveBeenNthCalledWith(2, 'GET', '/students/student%2F1/subjects');
    expect(useStudentStore.getState()).toMatchObject({
      selectedGuardianStudentId: 'student/1',
      subjects: [{ enabled: true, displayName: 'ریاضی پایه', weeklyTargetMinutes: 240 }],
    });
  });
});
