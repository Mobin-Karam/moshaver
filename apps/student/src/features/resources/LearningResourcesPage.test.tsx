import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { useStudentStore } from '../../services/student-store';
import { LearningResourcesPage } from './LearningResourcesPage';

describe('LearningResourcesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => cleanup());

  it('loads published resources assigned to the signed-in student', async () => {
    useStudentStore.setState({ access: { mode: 'student' }, selectedGuardianStudentId: null } as never);
    const request = vi.spyOn(apiClient, 'request').mockResolvedValueOnce([
      { id: 'resource-1', title: 'ویدئوی مرور', description: 'فصل اول', type: 'VIDEO', url: 'https://example.test/video' },
    ] as never);

    render(<MemoryRouter><LearningResourcesPage /></MemoryRouter>);

    expect(await screen.findByText('ویدئوی مرور')).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith('GET', '/learning-resources/assigned');
    expect(screen.getByRole('link', { name: /باز کردن منبع/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /باز کردن منبع/ })).toHaveAttribute('rel', 'noreferrer');
  });

  it('scopes guardian resources to the selected child', async () => {
    useStudentStore.setState({ access: { mode: 'guardian' }, selectedGuardianStudentId: 'student/1' } as never);
    const request = vi.spyOn(apiClient, 'request').mockResolvedValueOnce([] as never);

    render(<MemoryRouter><LearningResourcesPage /></MemoryRouter>);

    expect(await screen.findByText('هنوز منبعی برای شما منتشر نشده است.')).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith('GET', '/learning-resources/assigned?studentId=student%2F1');
  });
});
