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
    const request = vi
      .spyOn(apiClient, 'request')
      .mockResolvedValueOnce([
        {
          id: 'quiz-1',
          title: 'مرور ریاضی',
          subject: 'ریاضی',
          durationMinutes: 10,
          questionCount: 1,
          attempt: null,
        },
      ] as never)
      .mockResolvedValueOnce({
        runId: 'run-1',
        deadline: '2026-09-16T10:00:00Z',
        remainingSeconds: 600,
        savedAnswers: [],
        quiz: {
          id: 'quiz-1',
          title: 'مرور ریاضی',
          durationMinutes: 10,
          questions: [
            {
              id: 'question-1',
              text: 'دو به علاوه دو؟',
              options: ['۳', '۴', '۵', '۶'],
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({
        id: 'run-1',
        quizId: 'quiz-1',
        correct: 1,
        wrong: 0,
        blank: 0,
        percent: 100,
        review: [
          {
            questionId: 'question-1',
            selectedOption: 'b',
            correctOption: 'b',
            explanation: 'جمع ساده',
            isCorrect: true,
          },
        ],
      } as never)
      .mockResolvedValueOnce([
        {
          id: 'quiz-1',
          title: 'مرور ریاضی',
          subject: 'ریاضی',
          durationMinutes: 10,
          questionCount: 1,
          attempt: {
            id: 'run-1',
            submittedAt: '2026-09-15T10:00:00Z',
            percent: 100,
          },
        },
      ] as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <StudentQuizzesPage />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('button', { name: 'مشاهده و شروع' }),
    );
    expect(
      screen.getByText(
        'هر سؤال را جدا می‌بینی و پیش از ثبت نهایی فرصت مرور داری.',
        { exact: false },
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'آماده‌ام؛ شروع کنیم' }),
    );
    await user.click(screen.getByRole('radio', { name: /۴$/ }));
    await user.click(screen.getByRole('button', { name: 'مرور پاسخ‌ها' }));
    expect(
      screen.getByRole('heading', { name: 'آماده ثبت نهایی هستی؟' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'ثبت نهایی و دیدن نتیجه' }),
    );

    expect(await screen.findByText('۱۰۰٪')).toBeInTheDocument();
    expect(screen.getByText('پاسخت درست بود')).toBeInTheDocument();
    expect(request).toHaveBeenNthCalledWith(1, 'GET', '/student/quizzes');
    expect(request).toHaveBeenNthCalledWith(2, 'POST', '/quizzes/quiz-1/start');
    expect(request).toHaveBeenNthCalledWith(
      3,
      'POST',
      '/quizzes/quiz-1/attempts',
      {
        runId: 'run-1',
        answers: [{ questionId: 'question-1', selectedOption: 'b' }],
      },
    );
  });

  it('normalizes a saved legacy answer value to its stable option key', async () => {
    vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([{ id: 'quiz-1', title: 'مرور', durationMinutes: 5, questionCount: 1 }] as never)
      .mockResolvedValueOnce({
        runId: 'run-1', remainingSeconds: 300, savedAnswers: [{ questionId: 'q-1', selectedOption: 'ب' }],
        quiz: { id: 'quiz-1', title: 'مرور', durationMinutes: 5, questions: [{ id: 'q-1', text: 'پاسخ؟', options: ['الف', 'ب', 'ج', 'د'] }] },
      } as never);
    const user = userEvent.setup();
    render(<MemoryRouter><StudentQuizzesPage /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'مشاهده و شروع' }));
    await user.click(screen.getByRole('button', { name: 'آماده‌ام؛ شروع کنیم' }));
    expect(screen.getByRole('radio', { name: /ب$/ })).toBeChecked();
  });

  it('lets the student review unanswered questions without submitting', async () => {
    vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([
        {
          id: 'quiz-1',
          title: 'مرور ریاضی',
          durationMinutes: 10,
          questionCount: 2,
          attempt: null,
        },
      ] as never)
      .mockResolvedValueOnce({
        runId: 'run-1',
        deadline: '2026-09-16T10:00:00Z',
        remainingSeconds: 600,
        savedAnswers: [],
        quiz: {
          id: 'quiz-1',
          title: 'مرور ریاضی',
          durationMinutes: 10,
          questions: [
            { id: 'q-1', text: 'سؤال اول', options: ['الف', 'ب'] },
            { id: 'q-2', text: 'سؤال دوم', options: ['ج', 'د'] },
          ],
        },
      } as never);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <StudentQuizzesPage />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('button', { name: 'مشاهده و شروع' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'آماده‌ام؛ شروع کنیم' }),
    );
    await user.click(screen.getByRole('button', { name: 'بعدی' }));
    await user.click(screen.getByRole('button', { name: 'مرور پاسخ‌ها' }));

    expect(
      screen.getByText(
        '۲ سؤال بی‌پاسخ است؛ می‌توانی برگردی یا همین حالا ثبت کنی.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'سؤال ۱، بدون پاسخ' }));
    expect(
      screen.getByRole('heading', { name: 'سؤال اول' }),
    ).toBeInTheDocument();
  });
});
