import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { portalAccess } from '../../app/portal-access';
import { useStudentStore } from '../../services/student-store';
import { MoreRouterPage } from './MoreRouterPage';
import { apiClient } from '../../services/api-client';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('More navigation hub', () => {
  it('puts adviser chat first and exposes dedicated section routes', () => {
    useStudentStore.setState({
      access: portalAccess(['STUDENT'], [
        'student.profile.read',
        'tasks.update',
        'learning.create',
        'chat.read',
        'chat.send',
      ]),
      student: { id: 's1', name: 'سارا', grade: 'دوازدهم' },
    } as never);
    renderPage('/more');
    const hub = screen.getByRole('link', { name: /گفت‌وگو با مشاور/ }).closest('section')!;
    expect(within(hub).getByRole('link', { name: /گفت‌وگو با مشاور/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /صوت‌ها و آرامش/ })).toHaveAttribute('href', '/more/audio');
    expect(screen.getByRole('link', { name: /تنظیمات/ })).toHaveAttribute('href', '/more/settings');
    expect(screen.getByRole('link', { name: /روند و پیشنهادها/ })).toHaveAttribute('href', '/more/insights');
    expect(screen.getByRole('link', { name: /دفترچه اشتباهات/ })).toHaveAttribute('href', '/more/mistakes');
    expect(screen.getByRole('link', { name: /انتخاب سرپرست/ })).toHaveAttribute('href', '/more/guardian');
  });

  it('offers explicit light, dark and system theme choices with a back link', async () => {
    const onThemeChange = vi.fn();
    renderPage('/more/settings', onThemeChange);
    expect(screen.getByRole('link', { name: 'بازگشت به بیشتر' })).toHaveAttribute('href', '/more');
    await userEvent.click(screen.getByRole('button', { name: /تاریک/ }));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
    expect(screen.getByRole('group', { name: 'پوسته برنامه' })).toBeInTheDocument();
  });

  it('lets a student explicitly enable guardian read-only chat access', async () => {
    useStudentStore.setState({ access: portalAccess(['STUDENT'], ['student.profile.read', 'tasks.update', 'learning.create', 'chat.read']) } as never);
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async (method, path) => {
      if (method === 'GET' && path === '/student/chat-privacy') return { guardianReadOnly: false } as never;
      if (method === 'PATCH' && path === '/student/chat-privacy') return { guardianReadOnly: true } as never;
      if (path === '/auth/sessions') return [] as never;
      return {} as never;
    });
    renderPage('/more/settings');
    const toggle = await screen.findByRole('checkbox', { name: 'نمایش فقط‌خواندنی گفتگوها به سرپرست' });
    await userEvent.click(toggle);
    expect(request).toHaveBeenCalledWith('PATCH', '/student/chat-privacy', { guardianReadOnly: true });
    expect(toggle).toBeChecked();
  });

  it('edits the Telegram-style chat profile from More', async () => {
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async (method, path) => {
      if (method === 'GET' && path === '/chat/profile') return { id: 'u1', username: 'sara', displayName: 'سارا', bio: '', avatarUrl: '', usernameChange: { count: 0, allowed: true } } as never;
      if (method === 'PATCH' && path === '/chat/profile') return { id: 'u1', username: 'sara_k', displayName: 'سارا کریمی', bio: 'کنکوری ۱۴۰۶', avatarUrl: '', usernameChange: { count: 1, allowed: false } } as never;
      return {} as never;
    });
    renderPage('/more/chat-profile');
    await userEvent.clear(await screen.findByLabelText('نام نمایشی'));
    await userEvent.type(screen.getByLabelText('نام نمایشی'), 'سارا کریمی');
    await userEvent.clear(screen.getByLabelText('نام کاربری'));
    await userEvent.type(screen.getByLabelText('نام کاربری'), 'sara_k');
    await userEvent.type(screen.getByLabelText('درباره من'), 'کنکوری ۱۴۰۶');
    await userEvent.click(screen.getByRole('button', { name: 'ذخیره پروفایل' }));
    expect(request).toHaveBeenCalledWith('PATCH', '/chat/profile', expect.objectContaining({ displayName: 'سارا کریمی', username: 'sara_k', bio: 'کنکوری ۱۴۰۶' }));
  });

  it('searches for a guardian and submits a pending selection', async () => {
    useStudentStore.setState({ access: portalAccess(['STUDENT'], ['student.profile.read', 'tasks.update', 'learning.create']) } as never);
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async (method, path) => {
      if (method === 'GET' && path === '/student/guardian-selection') return { relationships: [], change: { allowed: true, nextAllowedAt: null } } as never;
      if (method === 'GET' && path.startsWith('/student/guardian-candidates')) return [{ id: 'g1', username: 'parent.sara', name: 'مریم کریمی', organization: { id: 'o1', name: 'مدرسه امید' } }] as never;
      if (method === 'POST' && path === '/student/guardian-selection') return { id: 'r1', status: 'PENDING' } as never;
      return {} as never;
    });
    renderPage('/more/guardian');
    expect(await screen.findByText('مریم کریمی')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'انتخاب' }));
    expect(request).toHaveBeenCalledWith('POST', '/student/guardian-selection', { guardianUserId: 'g1' });
  });

  it('shows the selected child subject plan without student-only private domains', async () => {
    useStudentStore.setState({
      access: portalAccess(['GUARDIAN'], ['guardian.students.read', 'studentSubjects.read']),
      selectedGuardianStudentId: 'student-1',
      student: { id: 'student-1', name: 'سارا' },
      subjects: [],
      relationships: [{ id: 'private-relationship', status: 'ACTIVE' }],
      mistakes: [{ id: 'private-mistake' }],
    } as never);
    vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce([{ id: 'student-1', name: 'سارا' }] as never)
      .mockResolvedValueOnce([{ subject: { id: 'subject-1', code: 'math', name: 'ریاضی' }, enabled: true, displayName: 'ریاضی پایه', weeklyTargetMinutes: 240 }] as never);

    renderPage('/more/profile');

    expect(await screen.findByText('ریاضی پایه')).toBeInTheDocument();
    expect(screen.getByText(/ریاضی پایه: ۲۴۰ دقیقه/)).toBeInTheDocument();
    expect(screen.queryByText('ارتباط‌های فعال')).not.toBeInTheDocument();
    expect(screen.queryByText('دفترچه اشتباهات')).not.toBeInTheDocument();
  });
});

function renderPage(path: string, onThemeChange = vi.fn()) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/more/:section?" element={<MoreRouterPage theme="light" onThemeChange={onThemeChange} />} /></Routes></MemoryRouter>);
}
