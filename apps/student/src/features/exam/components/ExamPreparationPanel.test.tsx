import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../services/api-client';
import { ExamPreparationPanel } from './ExamPreparationPanel';

describe('ExamPreparationPanel', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('loads syllabus and saves student progress', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([{ id: 'syllabus-1', subject: 'زیست', description: 'فصل یک', required: true, progress: null }] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({ id: 'progress-1' } as never);

    render(<ExamPreparationPanel examId="exam-1" attemptsUsed={0} allowedAttempts={1} />);
    expect(await screen.findByText('زیست')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('وضعیت مطالعه'), { target: { value: 'mastered' } });

    await waitFor(() => expect(request).toHaveBeenCalledWith('PUT', '/syllabus/syllabus-1/progress', {
      status: 'mastered', accuracy: 0, note: '',
    }));
  });

  it('submits a retry request only after attempts are exhausted', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({ id: 'retry-1', examId: 'exam-1', message: 'قطع اینترنت', status: 'pending', createdAt: new Date().toISOString() } as never);

    render(<ExamPreparationPanel examId="exam-1" attemptsUsed={1} allowedAttempts={1} />);
    await screen.findByText('درخواست تلاش مجدد');
    fireEvent.change(screen.getByLabelText('توضیح درخواست'), { target: { value: '  قطع اینترنت  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ارسال درخواست' }));

    await screen.findByText('در انتظار بررسی');
    expect(request).toHaveBeenLastCalledWith('POST', '/exams/exam-1/retry-request', { message: 'قطع اینترنت' });
  });

  it('shows the moderator decision instead of a duplicate request form', async () => {
    vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: 'retry-1', examId: 'exam-1', message: '', status: 'rejected', moderatorNote: 'مدرک کافی نیست', createdAt: new Date().toISOString() }] as never);

    render(<ExamPreparationPanel examId="exam-1" attemptsUsed={1} allowedAttempts={1} />);
    expect(await screen.findByText('درخواست رد شد')).toBeInTheDocument();
    expect(screen.getByText('یادداشت مسئول: مدرک کافی نیست')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ارسال درخواست' })).toBeInTheDocument();
  });
});
