import type { QuizAnswer, QuizRun } from '../types.js';

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
