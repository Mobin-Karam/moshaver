import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StudentAppShell } from '../layout/StudentAppShell';
import { ExamCard, NotificationCard, ScheduleCard, StudentProfileCard } from './index';
import { useStudentStore } from '../../services/student-store';
import type { PortalAccess } from '../../app/portal-access';

const task = { id: 'task-1', type: 'study' as const, subject: 'ریاضی', title: 'فصل دوم', start: '14:30', end: '15:30' };
const exam = { id: 'exam-1', title: 'آزمون جامع', durationMinutes: 60, subjects: ['ریاضی'], delivery: { questionCount: 20, attemptsUsed: 0, allowedAttempts: 1 } };

describe('student design system', () => {
  it('renders the profile, schedule, exam and notification contracts', async () => {
    const onRead = vi.fn();
    render(<MemoryRouter><StudentProfileCard name="مها کرم" grade="دوازدهم" major="انسانی" /><ScheduleCard task={task} status="next" /><ExamCard exam={exam} status="آماده شروع" /><NotificationCard notification={{ id: 'n1', title: 'تغییر برنامه', message: 'برنامه امروز تغییر کرد.' }} onRead={onRead} /></MemoryRouter>);
    expect(screen.getByText('مها کرم')).toBeInTheDocument();
    expect(screen.getByText('ریاضی · فصل دوم')).toBeInTheDocument();
    expect(screen.getByText('آزمون جامع')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /تغییر برنامه/ }));
    expect(onRead).toHaveBeenCalledOnce();
  });

  it('exposes five primary navigation targets and the unread count', () => {
    render(<MemoryRouter><StudentAppShell access={null} unread={3} syncLabel="آنلاین" theme="system" onThemeChange={vi.fn()}><p>محتوا</p></StudentAppShell></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'ناوبری اصلی' }).querySelectorAll('a')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /اعلان‌ها، ۳ خوانده‌نشده/ })).toBeInTheDocument();
  });

  it('opens the active task from the island with a deep link', async () => {
    useStudentStore.setState({ plan: { isoDate: '2026-09-10', title: 'برنامه', tasks: [task] }, activeSession: { id: 'session-1', taskId: task.id, startedAt: new Date().toISOString(), elapsedSeconds: 12, status: 'paused' } });
    const access: PortalAccess = { mode: 'student', canMutateStudentWork: true, canTakeExams: true, canReadGuardianStudents: false, canUseChat: true, navigation: ['today', 'plan', 'exams', 'chat', 'more'] };
    render(<MemoryRouter><StudentAppShell access={access} unread={0} syncLabel="آنلاین" theme="system" onThemeChange={vi.fn()}><Location /></StudentAppShell></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /ریاضی.*00:12/ }));
    await userEvent.click(screen.getByRole('button', { name: /جلسه مطالعه/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/plan?task=task-1');
    useStudentStore.setState({ activeSession: null });
  });
});

function Location() { const location = useLocation(); return <span data-testid="location">{location.pathname}{location.search}</span>; }
