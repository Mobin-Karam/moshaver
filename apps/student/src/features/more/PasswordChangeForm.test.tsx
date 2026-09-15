import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api-client';
import { PasswordChangeForm } from './PasswordChangeForm';

describe('PasswordChangeForm', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it('validates password policy and confirmation before the API call', () => {
    const request = vi.spyOn(apiClient, 'request');
    render(<PasswordChangeForm />);
    fireEvent.click(screen.getByRole('button', { name: /تغییر رمز عبور/ }));
    const fields = screen.getAllByLabelText(/رمز/);
    fireEvent.change(fields[0], { target: { value: 'old-password' } });
    fireEvent.change(fields[1], { target: { value: 'short' } });
    fireEvent.change(fields[2], { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'تغییر رمز عبور' }));

    expect(screen.getByRole('alert')).toHaveTextContent('حداقل ۱۲ نویسه');
    expect(request).not.toHaveBeenCalled();
  });

  it('changes the password through the authenticated API', async () => {
    const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ changed: true, otherSessionsRevoked: true } as never);
    render(<PasswordChangeForm />);
    fireEvent.click(screen.getByRole('button', { name: /تغییر رمز عبور/ }));
    const fields = screen.getAllByLabelText(/رمز/);
    fireEvent.change(fields[0], { target: { value: 'current-password' } });
    fireEvent.change(fields[1], { target: { value: 'new-password-123' } });
    fireEvent.change(fields[2], { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'تغییر رمز عبور' }));

    await waitFor(() => expect(request).toHaveBeenCalledWith('POST', '/auth/change-password', { currentPassword: 'current-password', newPassword: 'new-password-123' }));
    expect(await screen.findByText('رمز عبور تغییر کرد و نشست‌های دیگر لغو شدند.')).toBeInTheDocument();
  });
});
