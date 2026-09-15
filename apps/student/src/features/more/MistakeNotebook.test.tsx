import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { MistakeNotebook } from './MistakeNotebook';

describe('MistakeNotebook', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('classifies and resolves an owned mistake', async () => {
    const item = { id: 'mistake-1', questionId: 'question-1', reason: '', resolved: false };
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([item] as never)
      .mockResolvedValueOnce({ ...item, reason: 'بی‌دقتی' } as never)
      .mockResolvedValueOnce({ ...item, reason: 'بی‌دقتی', resolved: true } as never);
    render(<MistakeNotebook />);
    fireEvent.change(await screen.findByLabelText('دلیل اشتباه'), { target: { value: 'بی‌دقتی' } });
    await waitFor(() => expect(request).toHaveBeenNthCalledWith(2, 'PATCH', '/student/mistakes/mistake-1', { reason: 'بی‌دقتی' }));
    fireEvent.click(screen.getByRole('button', { name: 'مرور شد' }));
    await waitFor(() => expect(request).toHaveBeenNthCalledWith(3, 'PATCH', '/student/mistakes/mistake-1', { resolved: true }));
    expect(screen.getByRole('button', { name: 'بازگشت به فهرست مرور' })).toBeInTheDocument();
  });
});
