import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { ChatPage } from './ChatPage';

vi.mock('../../services/api-client', () => ({ apiClient: { request: vi.fn() } }));

const request = vi.mocked(apiClient.request);

beforeEach(() => {
  localStorage.clear();
  request.mockReset();
  request.mockImplementation(async (_method, path) => {
    if (path === '/chat/configuration') return { allowedEmojis: ['🤝', '📚'] } as never;
    if (path === '/chat/conversations') return [
      { id: 'advisor', type: 'direct', title: 'خانم احمدی', unread: 2, peer: { id: 'advisor-user', username: 'advisor.a', name: 'خانم احمدی' }, lastMessage: { id: 'm1', text: 'برنامه را دیدم', senderRole: 'ADMIN', createdAt: '2026-09-10T09:00:00.000Z' } },
      { id: 'group', type: 'group', title: 'گروه کنکور', memberCount: 12, unread: 0, lastMessage: { id: 'm2', text: 'آزمون فردا', senderRole: 'ADMIN', createdAt: '2026-09-10T10:00:00.000Z' } },
      { id: 'observed', type: 'direct', title: 'مشاور سارا', readOnly: true, observedStudent: { id: 's1', name: 'سارا' }, lastMessage: { id: 'm3', text: 'گزارش سارا', senderRole: 'ADMIN', createdAt: '2026-09-10T11:00:00.000Z' } },
    ] as never;
    if (path.startsWith('/chat/conversations/group/messages')) return [{ id: 'm2', text: 'آزمون فردا', senderRole: 'ADMIN', senderName: 'مشاور', createdAt: '2026-09-10T10:00:00.000Z' }] as never;
    if (path.startsWith('/chat/conversations/advisor/messages')) return [] as never;
    if (path.startsWith('/chat/conversations/observed/messages')) return [{ id: 'm3', text: 'گزارش سارا', senderRole: 'ADMIN', senderName: 'مشاور', createdAt: '2026-09-10T11:00:00.000Z' }] as never;
    if (path === '/chat/profiles/advisor-user') return { id: 'advisor-user', username: 'advisor.a', displayName: 'خانم احمدی', bio: 'مشاور تحصیلی' } as never;
    return {} as never;
  });
});

afterEach(() => cleanup());

describe('Student chat navigation', () => {
  it('shows every direct and group conversation before opening messages', async () => {
    render(<ChatPage />);
    expect(await screen.findByRole('button', { name: /خانم احمدی/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /گروه کنکور/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /گروه کنکور/ }));
    expect(await screen.findByRole('region', { name: 'گفت‌وگو با گروه کنکور' })).toBeInTheDocument();
    expect(screen.getByText('آزمون فردا')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'بازگشت به گفتگوها' }));
    expect(screen.getByRole('region', { name: 'گفت‌وگوها' })).toBeInTheDocument();
  });

  it('filters the inbox without opening an unrelated conversation', async () => {
    render(<ChatPage />);
    await screen.findByRole('button', { name: /خانم احمدی/ });
    fireEvent.change(screen.getByPlaceholderText('جست‌وجوی گفتگو یا نام کاربری'), { target: { value: 'کنکور' } });
    await waitFor(() => expect(screen.queryByRole('button', { name: /خانم احمدی/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /گروه کنکور/ })).toBeInTheDocument();
  });

  it('renders only platform-configured reaction choices', async () => {
    render(<ChatPage />);
    await userEvent.click(await screen.findByRole('button', { name: /گروه کنکور/ }));
    await userEvent.click(await screen.findByRole('button', { name: /پیام مشاور: آزمون فردا/ }));
    expect(screen.getByRole('button', { name: 'واکنش 🤝' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'واکنش 📚' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'واکنش ❤️' })).not.toBeInTheDocument();
  });

  it('labels guardian observations and removes every write control', async () => {
    render(<ChatPage />);
    const observed = await screen.findByRole('button', { name: /مشاور سارا.*فقط‌خواندنی/ });
    await userEvent.click(observed);
    expect(await screen.findByText('گفتگوی سارا را فقط مشاهده می‌کنید.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'متن پیام' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ارسال پیام' })).not.toBeInTheDocument();
  });

  it('opens the peer profile from a direct conversation header', async () => {
    render(<ChatPage />);
    await userEvent.click(await screen.findByRole('button', { name: /خانم احمدی/ }));
    await userEvent.click(screen.getByRole('button', { name: 'مشاهده پروفایل خانم احمدی' }));
    expect(await screen.findByRole('dialog', { name: 'پروفایل خانم احمدی' })).toHaveTextContent('@advisor.a');
    expect(screen.getByText('مشاور تحصیلی')).toBeInTheDocument();
  });
});
