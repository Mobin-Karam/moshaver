import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentStore } from '../../services/student-store';
import { LoginPage } from './LoginPage';

describe('Student login page', () => {
  const login = vi.fn();

  beforeEach(() => {
    login.mockReset();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    useStudentStore.setState({ authStatus: 'anonymous', loadStatus: 'idle', error: null, login } as never);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('validates required credentials before calling the API', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'ورود امن' }));

    expect(screen.getByRole('alert')).toHaveTextContent('نام کاربری و رمز عبور را کامل کنید.');
    expect(login).not.toHaveBeenCalled();
  });

  it('normalizes the username and submits the password unchanged', () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('نام کاربری'), { target: { value: '  student.one  ' } });
    fireEvent.change(screen.getByLabelText('رمز عبور'), { target: { value: ' secret value ' } });

    fireEvent.click(screen.getByRole('button', { name: 'ورود امن' }));

    expect(login).toHaveBeenCalledWith('student.one', ' secret value ');
  });

  it('lets the user reveal and hide the password', () => {
    render(<LoginPage />);
    const password = screen.getByLabelText('رمز عبور');

    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'نمایش رمز عبور' }));
    expect(password).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'پنهان کردن رمز عبور' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('prevents login and explains when the device is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<LoginPage />);

    expect(screen.getByRole('status')).toHaveTextContent('اینترنت در دسترس نیست');
    expect(screen.getByRole('button', { name: 'ورود امن' })).toBeDisabled();
  });
});
