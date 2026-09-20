import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RouteScrollRestoration } from './RouteScrollRestoration';

describe('RouteScrollRestoration', () => {
  it('starts every route and query-driven screen at the top', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    let navigate: ReturnType<typeof useNavigate> | undefined;
    function Controls() {
      navigate = useNavigate();
      return null;
    }

    render(<MemoryRouter initialEntries={['/']}><RouteScrollRestoration /><Controls /></MemoryRouter>);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    act(() => navigate?.('/quizzes'));
    expect(scrollTo).toHaveBeenCalledTimes(2);
    act(() => navigate?.('/exam?exam=exam-1'));
    expect(scrollTo).toHaveBeenCalledTimes(3);
  });
});
