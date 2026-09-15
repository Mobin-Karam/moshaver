import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { TaskSupportPanel } from './TaskSupportPanel';

describe('TaskSupportPanel', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it('loads existing student task messages and advisor responses', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({
      task: { id: 'task/1' },
      comments: [{ id: 'comment-1', text: 'منبع تمرین چیست؟', createdAt: '2026-09-14T10:00:00Z' }],
      issues: [{ id: 'issue-1', type: 'زمان نامناسب', description: 'با کلاس تداخل دارد', status: 'RESOLVED', advisorNote: 'زمان اصلاح شد', createdAt: '2026-09-14T10:00:00Z' }],
    } as never);

    render(<TaskSupportPanel taskId="task/1" />);

    expect(await screen.findByText('منبع تمرین چیست؟')).toBeInTheDocument();
    expect(screen.getByText('حل‌شده')).toBeInTheDocument();
    expect(screen.getByText(/زمان اصلاح شد/)).toBeInTheDocument();
    expect(apiClient.request).toHaveBeenCalledWith('GET', '/student/tasks/task%2F1');
  });

  it('posts a normalized comment and renders the returned record', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce({ comments: [], issues: [] } as never)
      .mockResolvedValueOnce({ id: 'comment-2', text: 'لطفاً بررسی کنید', createdAt: '2026-09-14T10:00:00Z' } as never);
    render(<TaskSupportPanel taskId="task-1" />);
    await screen.findByText('هنوز پیامی برای این فعالیت ثبت نشده است.');

    fireEvent.change(screen.getByLabelText('پیام کوتاه برای مشاور'), { target: { value: '  لطفاً بررسی کنید  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ارسال پیام' }));

    await waitFor(() => expect(request).toHaveBeenLastCalledWith('POST', '/student/tasks/task-1/comments', { text: 'لطفاً بررسی کنید' }));
    expect(await screen.findByText('لطفاً بررسی کنید')).toBeInTheDocument();
  });

  it('reports a structured task issue for the advisor inbox', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce({ comments: [], issues: [] } as never)
      .mockResolvedValueOnce({ id: 'issue-2', type: 'منبع در دسترس نیست', description: 'لینک باز نمی‌شود', status: 'OPEN', createdAt: '2026-09-14T10:00:00Z' } as never);
    render(<TaskSupportPanel taskId="task-1" />);
    await screen.findByText('هنوز پیامی برای این فعالیت ثبت نشده است.');

    fireEvent.click(screen.getByText('گزارش مشکل در فعالیت'));
    fireEvent.change(screen.getByLabelText('نوع مشکل'), { target: { value: 'منبع در دسترس نیست' } });
    fireEvent.change(screen.getByLabelText('توضیح'), { target: { value: '  لینک باز نمی‌شود  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ثبت و ارسال برای مشاور' }));

    await waitFor(() => expect(request).toHaveBeenLastCalledWith('POST', '/student/tasks/task-1/issues', { type: 'منبع در دسترس نیست', description: 'لینک باز نمی‌شود' }));
    expect(await screen.findByText('ارسال‌شده')).toBeInTheDocument();
  });
});
