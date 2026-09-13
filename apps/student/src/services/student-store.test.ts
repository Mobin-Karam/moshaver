import { beforeEach, describe, expect, it, vi } from 'vitest';
import { portalAccess } from '../app/portal-access';
import { apiClient } from './api-client';
import { useStudentStore } from './student-store';

const access = portalAccess(['student.profile.read', 'tasks.update', 'learning.create', 'exams.read']);

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
