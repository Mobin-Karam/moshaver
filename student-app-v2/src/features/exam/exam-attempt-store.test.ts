import { describe, expect, it, vi } from 'vitest';
import {
  attemptDraftKey,
  createAnswer,
  ExamAutosaveController,
  type AttemptDraft,
  type AttemptStorage,
} from './exam-attempt-store';

function fixture(): AttemptDraft {
  return {
    version: 2,
    accountId: 'student-1',
    run: {
      runId: 'attempt-1',
      startedAt: '2026-09-06T08:00:00.000Z',
      quiz: { id: 'exam-1', title: 'آزمون', durationMinutes: 60, questions: [] },
    },
    answers: [],
    index: 0,
    pending: false,
    updatedAt: '2026-09-06T08:00:00.000Z',
  };
}

describe('exam attempt persistence', () => {
  it('writes locally immediately and reports queued while offline', () => {
    const values = new Map<string, AttemptDraft>();
    const storage: AttemptStorage = {
      read: (key) => values.get(key) || null,
      write: (key, value) => values.set(key, value),
      remove: (key) => values.delete(key),
    };
    const controller = new ExamAutosaveController(fixture(), storage, vi.fn(), () => false);
    controller.update(
      createAnswer(
        undefined,
        { questionId: 'q1', selectedOption: 'b' },
        new Date('2026-09-06T08:01:00Z'),
      ),
    );

    expect(controller.getState()).toBe('queued');
    expect(values.get(attemptDraftKey('student-1', 'attempt-1'))?.answers[0]).toMatchObject({
      selectedOption: 'b',
      revision: 1,
    });
  });

  it('acknowledges server persistence without dropping a newer local revision', async () => {
    const storage: AttemptStorage = { read: vi.fn(), write: vi.fn(), remove: vi.fn() };
    const local = createAnswer(
      undefined,
      { questionId: 'q1', selectedOption: 'c' },
      new Date('2026-09-06T08:02:00Z'),
    );
    local.revision = 3;
    const saveServer = vi.fn().mockResolvedValue({
      savedAnswers: [
        {
          questionId: 'q1',
          selectedOption: 'a',
          revision: 2,
          clientUpdatedAt: '2026-09-06T08:01:00Z',
        },
      ],
    });
    const controller = new ExamAutosaveController(fixture(), storage, saveServer, () => true, 1);
    controller.update(local);
    expect(await controller.flush()).toBe(true);

    expect(controller.getState()).toBe('saved');
    expect(controller.getDraft().answers).toEqual([local]);
  });

  it('persists navigation independently from answer changes', () => {
    const values = new Map<string, AttemptDraft>();
    const storage: AttemptStorage = {
      read: (key) => values.get(key) || null,
      write: (key, value) => values.set(key, value),
      remove: (key) => values.delete(key),
    };
    const controller = new ExamAutosaveController(fixture(), storage, vi.fn(), () => true);

    controller.setIndex(3);

    expect(values.get(attemptDraftKey('student-1', 'attempt-1'))?.index).toBe(3);
  });
});
