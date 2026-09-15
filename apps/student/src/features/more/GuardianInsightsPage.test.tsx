import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { useStudentStore } from '../../services/student-store';
import { GuardianInsightsPage } from './GuardianInsightsPage';

describe('GuardianInsightsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStudentStore.setState({ selectedGuardianStudentId: 'student/1', student: { id: 'student/1', name: 'سارا' } } as never);
  });
  afterEach(() => cleanup());

  it('loads scoped progress and reports for the selected child', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce({ completed: 7, total: 10, percent: 70 } as never)
      .mockResolvedValueOnce([{ id: 'report-1', planDate: '2026-09-14', focus: 8, fatigue: 2, motivation: 9, problem: 'خسته بودم' }] as never);

    render(<GuardianInsightsPage />);

    expect(await screen.findByText('۷۰٪')).toBeInTheDocument();
    expect(screen.getByText('خسته بودم')).toBeInTheDocument();
    expect(request).toHaveBeenNthCalledWith(1, 'GET', '/guardian/students/student%2F1/progress');
    expect(request).toHaveBeenNthCalledWith(2, 'GET', '/guardian/students/student%2F1/reports');
  });

  it('sends a normalized encouragement to the selected child', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce({ completed: 0, total: 0, percent: 0 } as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({ id: 'notification-1' } as never);
    render(<GuardianInsightsPage />);
    await screen.findByText('هنوز گزارش شبانه‌ای ثبت نشده است.');

    fireEvent.change(screen.getByLabelText('نوع پیام'), { target: { value: 'KEEP_GOING' } });
    fireEvent.change(screen.getByLabelText('متن دلگرمی'), { target: { value: '  ادامه بده، عالی هستی  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ارسال دلگرمی' }));

    await waitFor(() => expect(request).toHaveBeenLastCalledWith('POST', '/guardian/students/student%2F1/encouragement', { message: 'ادامه بده، عالی هستی', kind: 'KEEP_GOING' }));
    expect(await screen.findByText('دلگرمی شما ارسال شد.')).toBeInTheDocument();
  });
});
