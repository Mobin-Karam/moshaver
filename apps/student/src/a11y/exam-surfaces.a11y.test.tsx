import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { ExamPreflight } from '../features/exam/components/ExamPreflight';
import { ExamRunner } from '../features/exam/components/ExamRunner';
import { GuardianExamView } from '../features/exam/components/GuardianExamView';

const exam = { id: 'exam-1', title: 'آزمون جامع تجربی', durationMinutes: 90, delivery: { canStart: true, questionCount: 1, attemptsUsed: 0, allowedAttempts: 1, state: 'available' as const } };

describe('exam surfaces accessibility', () => {
  it('keeps the preflight free from automatic accessibility violations', async () => {
    const { container } = render(<ExamPreflight exam={exam} busy={false} error="" onBack={vi.fn()} onStart={vi.fn()} />);
    expect((await audit(container)).violations).toEqual([]);
  });

  it('keeps the timed runner keyboard and screen-reader operable', async () => {
    const { container } = render(<ExamRunner run={{ runId: 'attempt-1', startedAt: new Date().toISOString(), remainingSeconds: 3600, quiz: { id: 'exam-1', examId: 'exam-1', title: exam.title, durationMinutes: 90, questions: [{ id: 'q-1', question: 'حاصل دو به علاوه دو؟', options: ['۱', '۲', '۳', '۴'] }] } }} answers={{}} index={0} saveState="saved" receivedAt={Date.now()} reviewing={false} busy={false} error="" onAnswer={vi.fn()} onMark={vi.fn()} onIndex={vi.fn()} onReview={vi.fn()} onContinue={vi.fn()} onSubmit={vi.fn()} />);
    expect((await audit(container)).violations).toEqual([]);
  });

  it('labels the family view as read-only without leaking answer keys', async () => {
    const { container, queryByText } = render(<GuardianExamView exams={[{ ...exam, delivery: { ...exam.delivery, state: 'withheld' } }]} />);
    expect(queryByText(/پاسخ درست/)).not.toBeInTheDocument();
    expect((await audit(container)).violations).toEqual([]);
  });
});

function audit(container: Element) {
  return axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
}
