import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAttemptAnswers,
  conflictPolicyForPath,
  countUnread,
  createTaskCompletionPayload,
  currentAndNextTask,
  markNotificationRead,
  planMetrics,
  plannedMinutes,
  remainingQuizSeconds,
  resolveConflict,
  taskStatus,
  unansweredCount,
} from '../dist/index.js';

test('planner keeps v1 task timing semantics', () => {
  const tasks = [
    { id: 'done', type: 'study', start: '08:00', end: '09:00', completion: { status: 'done', actualMinutes: 55, actualTests: 0 } },
    { id: 'current', type: 'test', start: '09:00', end: '10:30', testCount: 20 },
    { id: 'next', type: 'review', start: '11:00', end: '11:30' },
  ];

  assert.equal(plannedMinutes(tasks[1]), 90);
  assert.equal(taskStatus(tasks[0], '09:30'), 'done');
  assert.equal(taskStatus(tasks[1], '09:30'), 'current');
  assert.deepEqual(currentAndNextTask(tasks, '09:30', null), {
    current: tasks[1],
    next: null,
  });

  assert.deepEqual(planMetrics(tasks), {
    totalTasks: 3,
    doneTasks: 1,
    partialTasks: 0,
    plannedMinutes: 180,
    actualMinutes: 55,
    plannedTests: 20,
    actualTests: 0,
  });
});

test('active study session can be current outside scheduled window', () => {
  const tasks = [{ id: 'a', type: 'study', start: '08:00', end: '09:00' }];
  assert.deepEqual(currentAndNextTask(tasks, '10:00', { id: 's', taskId: 'a', startedAt: '2026-08-20T04:30:00.000Z' }), {
    current: tasks[0],
    next: null,
  });
});

test('task completion payload matches active-session and direct completion rules', () => {
  const task = { id: 't', type: 'test', start: '08:00', end: '09:00', testCount: 12 };
  assert.deepEqual(createTaskCompletionPayload(task, 'done'), {
    status: 'done',
    actualMinutes: 60,
    actualTests: 12,
    note: '',
  });
  assert.deepEqual(
    createTaskCompletionPayload(task, 'partial', '2026-08-20T08:00:00.000Z', new Date('2026-08-20T08:25:20.000Z')),
    {
      status: 'partial',
      actualMinutes: 25,
      actualTests: 0,
      note: '',
    },
  );
});

test('exam timer uses stricter of quiz duration and exam close time', () => {
  const run = {
    runId: 'r',
    startedAt: '2026-08-20T08:00:00.000Z',
    examCloseAt: '2026-08-20T08:20:00.000Z',
    quiz: { id: 'q', title: 'Exam', durationMinutes: 45, questions: [] },
  };

  assert.equal(remainingQuizSeconds(run, new Date('2026-08-20T08:05:00.000Z')), 900);
  assert.equal(remainingQuizSeconds(run, new Date('2026-08-20T08:21:00.000Z')), 0);
});

test('quiz attempt answer shaping preserves blanks', () => {
  assert.deepEqual(buildAttemptAnswers(['q1', 'q2'], { q1: 'b' }), [
    { questionId: 'q1', selectedOption: 'b', errorReason: '' },
    { questionId: 'q2', selectedOption: null, errorReason: '' },
  ]);
  assert.equal(unansweredCount(['q1', 'q2'], { q1: 'b' }), 1);
});

test('sync conflict policy maps student mutations deliberately', () => {
  assert.equal(conflictPolicyForPath('/plans?date=2026-08-20'), 'server-wins');
  assert.equal(conflictPolicyForPath('/tasks/t1/completion'), 'student-wins');
  assert.equal(conflictPolicyForPath('/chat/conversations/c1/messages'), 'student-wins');
  assert.equal(conflictPolicyForPath('/quizzes/q1/attempts'), 'manual');

  assert.equal(resolveConflict('server-wins', 'server', 'student'), 'server');
  assert.equal(resolveConflict('student-wins', 'server', 'student'), 'student');
  assert.deepEqual(resolveConflict('manual', 'server', 'student'), {
    requiresManualResolution: true,
    serverValue: 'server',
    studentValue: 'student',
  });
});

test('notifications helpers are immutable', () => {
  const notifications = [
    { id: '1', title: 'A', body: 'B', isRead: false },
    { id: '2', title: 'C', body: 'D', isRead: true },
  ];
  assert.equal(countUnread(notifications), 1);
  assert.equal(markNotificationRead(notifications, '1')[0].isRead, true);
  assert.equal(notifications[0].isRead, false);
});
