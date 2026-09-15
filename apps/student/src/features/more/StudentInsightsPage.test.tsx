import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { StudentInsightsPage } from './StudentInsightsPage';

describe('StudentInsightsPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shows self analytics and lets the student accept a staff recommendation', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce({ planCompletion: 75, studyDurationMinutes: 120, studySessions: 3, examPerformance: 18, questionAccuracy: 80, reviewConsistency: 4, averageMastery: 2 } as never)
      .mockResolvedValueOnce([{ id: 'rec-1', title: 'مرور زیست', type: 'STUDY', status: 'PROPOSED', createdAt: new Date().toISOString() }] as never)
      .mockResolvedValueOnce({ id: 'rec-1', status: 'ACCEPTED' } as never);

    render(<StudentInsightsPage />);
    expect(await screen.findByText('۷۵٪')).toBeInTheDocument();
    expect(screen.getByText('مرور زیست')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /می‌پذیرم/ }));

    await waitFor(() => expect(request).toHaveBeenLastCalledWith('PATCH', '/recommendations/rec-1', { status: 'ACCEPTED' }));
    expect(screen.queryByText('مرور زیست')).not.toBeInTheDocument();
  });
});
