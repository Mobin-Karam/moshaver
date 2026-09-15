import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { LearningItemsPanel } from './LearningItemsPanel';

describe('LearningItemsPanel', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it('creates and reviews a personal learning item', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({ id: 'item/1', title: 'مرور اتحادها', subject: 'ریاضی', dueDate: '2026-09-15', note: '', status: 'pending', mastery: 0 } as never)
      .mockResolvedValueOnce({ item: { id: 'item/1', title: 'مرور اتحادها', subject: 'ریاضی', dueDate: '2026-09-20', note: '', status: 'pending', mastery: 2 } } as never);
    render(<LearningItemsPanel />);
    await screen.findByText('هنوز مرور شخصی نساخته‌اید.');

    fireEvent.change(screen.getByLabelText('عنوان مرور'), { target: { value: '  مرور اتحادها  ' } });
    fireEvent.change(screen.getByLabelText('درس'), { target: { value: '  ریاضی  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'افزودن مرور' }));
    expect(await screen.findByText('مرور اتحادها')).toBeInTheDocument();
    expect(request).toHaveBeenNthCalledWith(2, 'POST', '/learning/items', expect.objectContaining({ title: 'مرور اتحادها', subject: 'ریاضی' }));

    fireEvent.click(screen.getByRole('button', { name: 'امتیاز 5' }));
    await waitFor(() => expect(request).toHaveBeenNthCalledWith(3, 'POST', '/learning/items/item%2F1/review', { rating: 5 }));
  });

  it('marks an item complete and deletes it after confirmation', async () => {
    const item = { id: 'item-1', title: 'مرور فصل', status: 'pending', mastery: 0 };
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([item] as never)
      .mockResolvedValueOnce({ ...item, status: 'done' } as never)
      .mockResolvedValueOnce({ id: 'item-1', deleted: true } as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<LearningItemsPanel />);
    await screen.findByText('مرور فصل');

    fireEvent.click(screen.getByRole('button', { name: 'انجام شد' }));
    await waitFor(() => expect(request).toHaveBeenNthCalledWith(2, 'PATCH', '/learning/items/item-1', { status: 'done' }));
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(request).toHaveBeenNthCalledWith(3, 'DELETE', '/learning/items/item-1'));
    expect(screen.queryByText('مرور فصل')).not.toBeInTheDocument();
  });
});
