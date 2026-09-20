import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentStore } from '../../services/student-store';
import { LoginPage } from './LoginPage';
import { apiClient } from '../../services/api-client';

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

  it('creates a student account with national code and a valid catalog selection', async () => {
    const request = vi.spyOn(apiClient, 'request')
      .mockResolvedValueOnce({ schoolYear: '1405-1406', grades: [{ id: 12, fa: 'پایه دوازدهم', level_id: 'upper_secondary' }], educationTypes: [{ id: 'theoretical', fa: 'شاخه نظری', levels: ['upper_secondary'] }], theoreticalTracks: [{ id: 'experimental_sciences', fa: 'علوم تجربی' }], vocationalFields: [], gradeStructure: [{ grades: [12], education_type_ids: ['theoretical'], track_required: true }] } as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({ id: 'student-1' } as never);
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'ساخت حساب' }));
    await screen.findByText('سال تحصیلی 1405-1406');
    fireEvent.change(screen.getByLabelText('نام و نام خانوادگی'), { target: { value: 'دانش آموز نمونه' } });
    fireEvent.change(screen.getByLabelText('کد ملی'), { target: { value: '۹۰۰۰۰۰۰۰۱۷' } });
    fireEvent.change(screen.getByLabelText('پایه'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('نوع آموزش'), { target: { value: 'theoretical' } });
    fireEvent.change(screen.getByLabelText('رشته'), { target: { value: 'experimental_sciences' } });
    fireEvent.change(screen.getByLabelText('رمز عبور جدید'), { target: { value: 'Student-pass-2026!' } });
    fireEvent.change(screen.getByLabelText('تکرار رمز عبور'), { target: { value: 'Student-pass-2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب' }));
    expect(await screen.findByText('حساب ساخته شد')).toBeInTheDocument();
    expect(request).toHaveBeenLastCalledWith('POST', '/onboarding/student-signup', expect.objectContaining({ nationalCode: '9000000017', grade: 12, educationTypeId: 'theoretical', trackId: 'experimental_sciences' }), { skipSyncQueue: true });
  });
});
