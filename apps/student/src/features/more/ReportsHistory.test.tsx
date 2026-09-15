import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { ReportsHistory } from './ReportsHistory';

describe('ReportsHistory', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it('shows daily reports and recovery request moderation status', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([{ id: 'report-1', planDate: '2026-09-14', focus: 8, fatigue: 3, motivation: 9, problem: 'زمان کم بود' }] as never)
      .mockResolvedValueOnce([{ id: 'recovery-1', planDate: '2026-09-13', reason: 'بیماری', note: 'نیاز به برنامه جدید', status: 'resolved', createdAt: '2026-09-14T10:00:00Z' }] as never);

    render(<ReportsHistory />);

    expect(await screen.findByText(/رسیدگی و حل شد/)).toBeInTheDocument();
    expect(screen.getByText('زمان کم بود')).toBeInTheDocument();
    expect(screen.getByText('نیاز به برنامه جدید')).toBeInTheDocument();
    expect(request).toHaveBeenNthCalledWith(1, 'GET', '/reports?limit=10');
    expect(request).toHaveBeenNthCalledWith(2, 'GET', '/recovery-requests');
  });

  it('keeps an explicit empty state', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue([] as never);
    render(<ReportsHistory />);
    expect(await screen.findByText('هنوز گزارشی ارسال نشده است.')).toBeInTheDocument();
  });
});
