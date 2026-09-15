import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pushApi = vi.hoisted(() => ({
  getPushStatus: vi.fn(), requestNotificationPermission: vi.fn(), disablePwaPushSubscription: vi.fn(), savePushPreferences: vi.fn(), sendTestPush: vi.fn(),
}));
vi.mock('../../services/notification-service', () => pushApi);
import { PushSettings } from './PushSettings';

const active = { supported: true, permission: 'granted', registered: true, serverConfigured: true, preferences: { lessons: true, messages: true, exams: true, announcements: true } };

describe('PushSettings', () => {
  beforeEach(() => { Object.values(pushApi).forEach((mock) => mock.mockReset()); pushApi.getPushStatus.mockResolvedValue(active); });
  afterEach(() => cleanup());

  it('loads device status and saves category preferences', async () => {
    pushApi.savePushPreferences.mockResolvedValue(active);
    render(<PushSettings />);
    expect(await screen.findByText('اعلان سیستمی فعال است')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('پیام‌های گفتگو'));
    await waitFor(() => expect(pushApi.savePushPreferences).toHaveBeenCalledWith({ ...active.preferences, messages: false }));
  });

  it('disables both remote and local subscription state', async () => {
    pushApi.disablePwaPushSubscription.mockResolvedValue(undefined);
    pushApi.getPushStatus.mockResolvedValueOnce(active).mockResolvedValueOnce({ ...active, registered: false });
    render(<PushSettings />);
    await screen.findByText('اعلان سیستمی فعال است');
    fireEvent.click(screen.getByRole('button', { name: 'غیرفعال‌سازی' }));

    await waitFor(() => expect(pushApi.disablePwaPushSubscription).toHaveBeenCalled());
    expect(await screen.findByText('اعلان سیستمی غیرفعال است')).toBeInTheDocument();
  });
});
