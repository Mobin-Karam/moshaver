import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../features/auth/LoginPage';
import { useStudentStore } from '../services/student-store';

describe('student login accessibility', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    useStudentStore.setState({ authStatus: 'anonymous', loadStatus: 'idle', error: null, login: vi.fn() } as never);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('has no automatic accessibility violations', async () => {
    const { container } = render(<LoginPage />);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
