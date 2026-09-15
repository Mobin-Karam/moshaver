import { cleanup, render, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuardianInsightsPage } from '../features/more/GuardianInsightsPage';
import { ReportsHistory } from '../features/more/ReportsHistory';
import { TaskSupportPanel } from '../features/plan/TaskSupportPanel';
import { apiClient } from '../services/api-client';
import { useStudentStore } from '../services/student-store';

describe('new API feature surfaces accessibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStudentStore.setState({ selectedGuardianStudentId: 'student-1', student: { id: 'student-1', name: 'سارا' } } as never);
  });
  afterEach(() => cleanup());

  it('keeps task support accessible', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({ comments: [], issues: [] } as never);
    const { container, findByText } = render(<TaskSupportPanel taskId="task-1" />);
    await findByText('هنوز پیامی برای این فعالیت ثبت نشده است.');
    expect((await audit(container)).violations).toEqual([]);
  });

  it('keeps report and family insights accessible', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue([] as never);
    const reports = render(<ReportsHistory />);
    await reports.findByText('هنوز گزارشی ارسال نشده است.');
    expect((await audit(reports.container)).violations).toEqual([]);
    cleanup();

    const family = render(<GuardianInsightsPage />);
    await waitFor(() => expect(family.getByText('هنوز گزارش شبانه‌ای ثبت نشده است.')).toBeInTheDocument());
    expect((await audit(family.container)).violations).toEqual([]);
  });
});

function audit(container: Element) { return axe.run(container, { rules: { 'color-contrast': { enabled: false } } }); }
