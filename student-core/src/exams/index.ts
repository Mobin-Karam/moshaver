import type { AttemptAnswer, ExamSummary, QuizAnswer, QuizRun } from '../types.js';

export type QuestionState = 'current' | 'unanswered' | 'seen' | 'answered' | 'marked';

export function questionState(answer: Partial<AttemptAnswer> | undefined, current = false): QuestionState {
  if (current) return 'current';
  if (answer?.marked) return 'marked';
  if (answer?.selectedOption) return 'answered';
  if (answer?.visited) return 'seen';
  return 'unanswered';
}

export function attemptSummary(questionIds: string[], answers: Record<string, Partial<AttemptAnswer> | undefined>) {
  return questionIds.reduce(
    (summary, id) => {
      const answer = answers[id];
      if (answer?.selectedOption) summary.answered += 1;
      else summary.unanswered += 1;
      if (answer?.marked) summary.marked += 1;
      if (answer?.visited && !answer.selectedOption) summary.seen += 1;
      return summary;
    },
    { total: questionIds.length, answered: 0, unanswered: 0, marked: 0, seen: 0 },
  );
}

export function reconcileAttemptAnswers(local: AttemptAnswer[], server: AttemptAnswer[]): AttemptAnswer[] {
  const merged = new Map<string, AttemptAnswer>();
  for (const answer of [...server, ...local]) {
    const existing = merged.get(answer.questionId);
    if (!existing || answer.revision > existing.revision ||
      (answer.revision === existing.revision && Date.parse(answer.clientUpdatedAt) > Date.parse(existing.clientUpdatedAt))) {
      merged.set(answer.questionId, answer);
    }
  }
  return [...merged.values()];
}

export function examAvailability(exam: Pick<ExamSummary, 'openAt' | 'closeAt' | 'delivery'>, now: Date) {
  if (exam.delivery?.activeAttemptId) return { state: 'active' as const, canStart: true };
  if (exam.openAt && now < new Date(exam.openAt)) return { state: 'upcoming' as const, canStart: false };
  if (exam.closeAt && now >= new Date(exam.closeAt)) return { state: 'closed' as const, canStart: false };
  if (exam.delivery?.canStart === false) return { state: 'closed' as const, canStart: false };
  return { state: 'available' as const, canStart: true };
}

export function remainingServerSeconds(
  timing: { deadlineAt: string; serverTime: string; receivedAt: number },
  now = Date.now(),
) {
  const estimatedServerNow = Date.parse(timing.serverTime) + Math.max(0, now - timing.receivedAt);
  return Math.max(0, Math.ceil((Date.parse(timing.deadlineAt) - estimatedServerNow) / 1000));
}

export function remainingQuizSeconds(
  run: Pick<QuizRun, 'quiz' | 'startedAt' | 'examCloseAt'>,
  now: Date,
): number {
  const durationSeconds = Math.max(1, Number(run.quiz.durationMinutes || 20)) * 60;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(run.startedAt).getTime()) / 1000),
  );
  let remaining = Math.max(0, durationSeconds - elapsedSeconds);

  if (run.examCloseAt) {
    const closeRemaining = Math.max(
      0,
      Math.floor((new Date(run.examCloseAt).getTime() - now.getTime()) / 1000),
    );
    remaining = Math.min(remaining, closeRemaining);
  }

  return remaining;
}

export function buildAttemptAnswers(
  questionIds: string[],
  selected: Record<string, 'a' | 'b' | 'c' | 'd' | null | undefined>,
): QuizAnswer[] {
  return questionIds.map((questionId) => ({
    questionId,
    selectedOption: selected[questionId] ?? null,
    errorReason: '',
  }));
}

export function unansweredCount(
  questionIds: string[],
  selected: Record<string, unknown>,
): number {
  return questionIds.filter((id) => !selected[id]).length;
}
