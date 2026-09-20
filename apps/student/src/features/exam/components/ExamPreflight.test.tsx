import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/api-client';
import { ExamPreflight } from './ExamPreflight';

const exam = {
  id: 'exam-1',
  title: 'آزمون آرام ریاضی',
  durationMinutes: 20,
  delivery: {
    canStart: true,
    questionCount: 10,
    attemptsUsed: 0,
    allowedAttempts: 1,
    state: 'available' as const,
  },
};

describe('ExamPreflight', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'request').mockResolvedValue([] as never);
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
  });

  it('resumes an active attempt without asking the student to accept the guide again', () => {
    render(
      <ExamPreflight
        exam={{
          ...exam,
          delivery: { ...exam.delivery, activeAttemptId: 'attempt-1' },
        }}
        busy={false}
        error=""
        onBack={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'پاسخ‌های قبلی محفوظ‌اند؛ می‌توانی از همان‌جا ادامه بدهی.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ادامه آزمون' })).toBeEnabled();
  });

  it('reacts when connectivity returns instead of leaving start disabled', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    render(
      <ExamPreflight
        exam={exam}
        busy={false}
        error=""
        onBack={vi.fn()}
        onStart={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'شروع آزمون' })).toBeDisabled();

    fireEvent(window, new Event('online'));
    expect(screen.getByRole('button', { name: 'شروع آزمون' })).toBeEnabled();
  });

  it('explains exhausted attempts instead of showing a silent disabled action', () => {
    render(
      <ExamPreflight
        exam={{
          ...exam,
          delivery: { ...exam.delivery, canStart: false, attemptsUsed: 1 },
        }}
        busy={false}
        error=""
        onBack={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/تعداد تلاش‌های مجاز استفاده شده است/),
    ).toBeInTheDocument();
  });
});
