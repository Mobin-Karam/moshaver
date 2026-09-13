import {
  reconcileAttemptAnswers,
  type AnswerSaveState,
  type AttemptAnswer,
  type QuizRun,
} from '@moshaver/student-core';

export interface AttemptDraft {
  version: 2;
  accountId: string;
  run: QuizRun;
  answers: AttemptAnswer[];
  index: number;
  pending: boolean;
  updatedAt: string;
}

export interface AttemptStorage {
  read(key: string): AttemptDraft | null;
  write(key: string, draft: AttemptDraft): void;
  remove(key: string): void;
}

export const browserAttemptStorage: AttemptStorage = {
  read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as AttemptDraft) : null;
    } catch {
      return null;
    }
  },
  write(key, draft) {
    localStorage.setItem(key, JSON.stringify(draft));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

export function attemptDraftKey(accountId: string, attemptId: string) {
  return `moshaver:v2:exam:${accountId}:${attemptId}`;
}

export function createAnswer(
  previous: AttemptAnswer | undefined,
  input: Pick<AttemptAnswer, 'questionId' | 'selectedOption'> &
    Partial<Pick<AttemptAnswer, 'marked' | 'visited'>>,
  now = new Date(),
): AttemptAnswer {
  return {
    questionId: input.questionId,
    selectedOption: input.selectedOption,
    marked: input.marked ?? previous?.marked ?? false,
    visited: input.visited ?? true,
    clientUpdatedAt: now.toISOString(),
    revision: (previous?.revision ?? 0) + 1,
  };
}

type Listener = (state: AnswerSaveState) => void;

export class ExamAutosaveController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private state: AnswerSaveState = 'local';

  constructor(
    private draft: AttemptDraft,
    private readonly storage: AttemptStorage,
    private readonly saveServer: (
      answers: AttemptAnswer[],
    ) => Promise<{ savedAnswers?: AttemptAnswer[] }>,
    private readonly online: () => boolean,
    private readonly delay = 700,
  ) {}

  getDraft() {
    return this.draft;
  }

  getState() {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  update(answer: AttemptAnswer, index = this.draft.index) {
    this.draft = {
      ...this.draft,
      answers: reconcileAttemptAnswers([answer], this.draft.answers),
      index,
      pending: true,
      updatedAt: answer.clientUpdatedAt,
    };
    this.persist();
    if (!this.online()) {
      this.setState('queued');
      return;
    }
    this.setState('local');
    this.schedule();
  }

  setIndex(index: number) {
    this.draft = { ...this.draft, index };
    this.persist();
  }

  async flush() {
    if (!this.draft.pending) return true;
    if (!this.online()) {
      this.setState('queued');
      return false;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.setState('saving');
    try {
      const response = await this.saveServer(this.draft.answers);
      this.draft = {
        ...this.draft,
        answers: reconcileAttemptAnswers(this.draft.answers, response.savedAnswers || []),
        pending: false,
      };
      this.persist();
      this.setState('saved');
      return true;
    } catch {
      this.draft = { ...this.draft, pending: true };
      this.persist();
      this.setState(this.online() ? 'failed' : 'queued');
      return false;
    }
  }

  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.storage.remove(attemptDraftKey(this.draft.accountId, this.draft.run.runId));
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  private persist() {
    this.storage.write(attemptDraftKey(this.draft.accountId, this.draft.run.runId), this.draft);
  }

  private setState(state: AnswerSaveState) {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
