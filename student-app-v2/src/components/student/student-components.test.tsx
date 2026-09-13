import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentAppShell } from '../layout/StudentAppShell';
import { ExamCard, NotificationCard, ScheduleCard, StudentProfileCard } from './index';
import { useStudentStore } from '../../services/student-store';
import { useRelaxationPlayer } from '../../services/relaxation-player';
import type { PortalAccess } from '../../app/portal-access';

const task = { id: 'task-1', type: 'study' as const, subject: 'ریاضی', title: 'فصل دوم', start: '14:30', end: '15:30' };
const exam = { id: 'exam-1', title: 'آزمون جامع', durationMinutes: 60, subjects: ['ریاضی'], delivery: { questionCount: 20, attemptsUsed: 0, allowedAttempts: 1 } };
const studentAccess: PortalAccess = { mode: 'student', canMutateStudentWork: true, canTakeExams: true, canReadGuardianStudents: false, canUseChat: true, navigation: ['today', 'plan', 'exams', 'chat', 'more'] };

afterEach(() => {
  cleanup();
  useStudentStore.setState({ activeSession: null });
  useRelaxationPlayer.setState({ selected: null, playback: 'idle', playing: false, buffering: false, currentTime: 0, duration: 0 });
});

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
    expect(screen.getByRole('link', { name: /گفتگو، ۳ خوانده‌نشده/ })).toBeInTheDocument();
  });

  it('opens the active task from the island with a deep link', async () => {
    useStudentStore.setState({ plan: { isoDate: '2026-09-10', title: 'برنامه', tasks: [task] }, activeSession: { id: 'session-1', taskId: task.id, startedAt: new Date().toISOString(), elapsedSeconds: 12, status: 'paused' } });
    render(<MemoryRouter><StudentAppShell access={studentAccess} unread={0} syncLabel="آنلاین" theme="system" onThemeChange={vi.fn()}><Location /></StudentAppShell></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /ریاضی.*00:12/ }));
    await userEvent.click(screen.getByRole('button', { name: /مطالعه در مکث:/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/plan?task=task-1');
  });

  it('keeps paused audio available in the island and opens its full controls', async () => {
    useStudentStore.setState({ activeSession: null });
    useRelaxationPlayer.setState({
      selected: { id: 'audio-1', title: 'آرامش امروز', artist: 'مشاور', url: 'https://example.test/audio.mp3', active: true },
      playback: 'paused', playing: false, buffering: false, currentTime: 30, duration: 120,
    });
    render(<MemoryRouter initialEntries={['/plan']}><StudentAppShell access={studentAccess} unread={0} syncLabel="آنلاین" theme="system" onThemeChange={vi.fn()}><Location /></StudentAppShell></MemoryRouter>);
    expect(screen.getByText('پخش در مکث')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ادامه صوت' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /پخش در مکث.*آرامش امروز/ }));
    await userEvent.click(screen.getByRole('button', { name: /پخش در مکث: آرامش امروز/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/more/audio');
  });

  it('shows how far a study session has exceeded the planned task limit', () => {
    useStudentStore.setState({ plan: { isoDate: '2026-09-10', title: 'برنامه', tasks: [task] }, activeSession: { id: 'session-overtime', taskId: task.id, startedAt: new Date().toISOString(), elapsedSeconds: 3_700, status: 'paused' } });
    render(<MemoryRouter><StudentAppShell access={studentAccess} unread={0} syncLabel="آنلاین" theme="system" onThemeChange={vi.fn()}><Location /></StudentAppShell></MemoryRouter>);
    expect(screen.getByText('بیشتر از زمان برنامه')).toBeInTheDocument();
    expect(screen.getByText('+01:40')).toBeInTheDocument();
  });
});

function Location() { const location = useLocation(); return <span data-testid="location">{location.pathname}{location.search}{location.hash}</span>; }
