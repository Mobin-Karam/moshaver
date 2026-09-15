import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { StudentQuizzesPage } from './StudentQuizzesPage';

describe('StudentQuizzesPage', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it('lists available quizzes, submits answers, and renders the review', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([{ id: 'quiz-1', title: 'مرور ریاضی', subject: 'ریاضی', durationMinutes: 10, questionCount: 1, attempt: null }] as never)
      .mockResolvedValueOnce({ runId: 'run-1', deadline: '2026-09-16T10:00:00Z', remainingSeconds: 600, savedAnswers: [], quiz: { id: 'quiz-1', title: 'مرور ریاضی', durationMinutes: 10, questions: [{ id: 'question-1', text: 'دو به علاوه دو؟', options: ['۳', '۴', '۵', '۶'] }] } } as never)
      .mockResolvedValueOnce({ id: 'run-1', quizId: 'quiz-1', correct: 1, wrong: 0, blank: 0, percent: 100, review: [{ questionId: 'question-1', selectedOption: '۴', correctOption: '۴', explanation: 'جمع ساده', isCorrect: true }] } as never)
      .mockResolvedValueOnce([{ id: 'quiz-1', title: 'مرور ریاضی', subject: 'ریاضی', durationMinutes: 10, questionCount: 1, attempt: { id: 'run-1', submittedAt: '2026-09-15T10:00:00Z', percent: 100 } }] as never);
    const user = userEvent.setup();

    render(<MemoryRouter><StudentQuizzesPage /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'شروع' }));
    await user.click(screen.getByLabelText('۴'));
    await user.click(screen.getByRole('button', { name: 'ثبت و مشاهده نتیجه' }));

    expect(await screen.findByText('۱۰۰٪')).toBeInTheDocument();
    expect(screen.getByText('پاسخ صحیح: ۴')).toBeInTheDocument();
    expect(request).toHaveBeenNthCalledWith(1, 'GET', '/student/quizzes');
    expect(request).toHaveBeenNthCalledWith(2, 'POST', '/quizzes/quiz-1/start');
    expect(request).toHaveBeenNthCalledWith(3, 'POST', '/quizzes/quiz-1/attempts', {
      runId: 'run-1',
      answers: [{ questionId: 'question-1', selectedOption: '۴' }],
    });
  });
});
