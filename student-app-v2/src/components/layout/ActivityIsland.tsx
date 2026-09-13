import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronUp, Cloud, GraduationCap, Headphones, LoaderCircle, Music2, Pause, Play, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../services/student-store';
import { useRelaxationPlayer } from '../../services/relaxation-player';

type ActivityKind = 'exam' | 'study' | 'audio' | 'sync';
interface CompactActivity { kind: ActivityKind; label: string; title: string; meta?: string; }

export function ActivityIsland({ syncLabel }: { syncLabel: string }) {
  const session = useStudentStore((state) => state.activeSession);
  const tasks = useStudentStore((state) => state.plan.tasks);
  const exams = useStudentStore((state) => state.exams);
  const pause = useStudentStore((state) => state.pauseFocus);
  const resume = useStudentStore((state) => state.resumeFocus);
  const heartbeat = useStudentStore((state) => state.heartbeatFocus);
  const selectedTrack = useRelaxationPlayer((state) => state.selected);
  const playback = useRelaxationPlayer((state) => state.playback);
  const audioPlaying = useRelaxationPlayer((state) => state.playing);
  const audioBuffering = useRelaxationPlayer((state) => state.buffering);
  const audioDuration = useRelaxationPlayer((state) => state.duration);
  const audioCurrentTime = useRelaxationPlayer((state) => state.currentTime);
  const bufferedPercent = useRelaxationPlayer((state) => state.bufferedPercent);
  const toggleAudio = useRelaxationPlayer((state) => state.toggle);
  const navigate = useNavigate();
  const location = useLocation();
  const root = useRef<HTMLElement>(null);
  const summaryButton = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const task = tasks.find((item) => item.id === session?.taskId);
  const activeExam = exams.find((item) => Boolean(item.delivery?.activeAttemptId) || item.delivery?.state === 'active');
  const elapsed = session ? session.elapsedSeconds + (session.status === 'running' ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000)) : 0) : 0;
  const taskLimitSeconds = task ? plannedSeconds(task.start, task.end) : 0;
  const overtime = Boolean(taskLimitSeconds && elapsed >= taskLimitSeconds);
  const audioActive = Boolean(selectedTrack && !['idle', 'ended', 'error'].includes(playback));
  const showAudio = audioActive && location.pathname !== '/more/audio' && !(location.pathname === '/more' && location.hash === '#relaxation-title');

  const activities = useMemo<CompactActivity[]>(() => [
    activeExam ? { kind: 'exam', label: 'آزمون در حال اجرا', title: activeExam.title, meta: 'ادامه آزمون' } : null,
    session ? { kind: 'study', label: overtime ? 'بیشتر از زمان برنامه' : session.status === 'running' ? 'جلسه مطالعه' : 'مطالعه در مکث', title: [task?.subject, task?.title].filter(Boolean).join(' · ') || 'فعالیت جاری', meta: overtime ? `+${formatTime(elapsed - taskLimitSeconds)}` : formatTime(elapsed) } : null,
    showAudio && selectedTrack ? { kind: 'audio', label: audioBuffering ? 'در حال آماده‌سازی صوت' : audioPlaying ? 'در حال پخش' : 'پخش در مکث', title: selectedTrack.title, meta: audioDuration > 0 ? `-${formatTime(audioDuration - audioCurrentTime)}` : undefined } : null,
    syncLabel !== 'آنلاین' ? { kind: 'sync', label: 'وضعیت داده‌ها', title: syncLabel } : null,
  ].filter((item): item is CompactActivity => Boolean(item)), [activeExam, audioBuffering, audioCurrentTime, audioDuration, audioPlaying, elapsed, overtime, selectedTrack, session, showAudio, syncLabel, task?.subject, task?.title, taskLimitSeconds]);

  useEffect(() => {
    if (session?.status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session?.status]);
  useEffect(() => {
    if (session?.status !== 'running' || session.id.startsWith('local-')) return;
    const send = () => void heartbeat();
    const id = window.setInterval(send, 30_000);
    const onVisibility = () => { if (document.visibilityState === 'hidden') send(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, [heartbeat, session?.id, session?.status]);
  useEffect(() => { setExpanded(false); }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setExpanded(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setExpanded(false); summaryButton.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [expanded]);

  function go(path: string) { setExpanded(false); navigate(path); }
  const primary = activities[0];
  const primaryHasControl = primary?.kind === 'study' || primary?.kind === 'audio';

  return <aside ref={root} className={`activity-island ${expanded ? 'is-expanded' : ''} ${activities.length ? 'has-activities' : 'is-idle'} ${overtime ? 'has-overtime' : ''}`} aria-label="فعالیت‌های در حال اجرا" aria-live="polite">
    <div className="activity-island__compact">
      <button ref={summaryButton} type="button" className="activity-island__summary" onClick={() => activities.length && setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="activity-island-sessions" disabled={!activities.length}>
        <span className={`activity-island__primary-icon activity-island__primary-icon--${primary?.kind || 'idle'}`} aria-hidden="true">{primary ? activityIcon(primary.kind, primary.kind === 'sync' && syncLabel !== 'همگام شد') : null}</span>
        <span className="activity-island__summary-copy"><small>{primary?.label || 'فعالیت جاری'}</small><strong>{primary?.title || 'اکنون فعالیتی در حال اجرا نیست'}</strong></span>
        {primary?.meta ? <b className="activity-island__time" dir="ltr">{primary.meta}</b> : null}
        <span className="activity-island__markers" aria-label={`${activities.length.toLocaleString('fa-IR')} فعالیت جاری`}>
          {activities.slice(0, 3).map((activity) => <i key={activity.kind} className={`activity-marker activity-marker--${activity.kind}`} title={activity.label} />)}
          {activities.length > 3 ? <em>+{(activities.length - 3).toLocaleString('fa-IR')}</em> : null}
        </span>
        {activities.length ? <ChevronUp className="activity-island__chevron" aria-hidden="true" /> : null}
      </button>
      {primaryHasControl ? <button type="button" className={`activity-island__quick-control activity-island__quick-control--${primary.kind}`} onClick={() => void (primary.kind === 'study' ? (session?.status === 'running' ? pause() : resume()) : toggleAudio())} aria-label={primary.kind === 'study' ? (session?.status === 'running' ? 'مکث مطالعه' : 'ادامه مطالعه') : (audioPlaying || audioBuffering ? 'مکث صوت' : 'ادامه صوت')}>
        {primary.kind === 'study' ? (session?.status === 'running' ? <Pause /> : <Play />) : audioBuffering ? <LoaderCircle /> : audioPlaying ? <Pause /> : <Play />}
      </button> : null}
    </div>
    {showAudio && audioBuffering ? <span className="activity-island__buffer-track" aria-label={`آماده‌سازی صوت ${Math.round(bufferedPercent).toLocaleString('fa-IR')} درصد`}><i style={{ inlineSize: `${Math.max(4, bufferedPercent)}%` }} /></span> : null}
    {expanded ? <div className="activity-island__board" id="activity-island-sessions">
      <header><span><small>مرکز فعالیت</small><strong>{activities.length.toLocaleString('fa-IR')} فعالیت جاری</strong></span><button type="button" onClick={() => { setExpanded(false); summaryButton.current?.focus(); }} aria-label="بستن مرکز فعالیت"><X /></button></header>
      <div className="activity-island__sessions">
        {activeExam ? <Session kind="exam" icon={<GraduationCap />} label="آزمون در حال اجرا" title={activeExam.title} meta="ادامه آزمون" onOpen={() => go(`/exam?exam=${encodeURIComponent(activeExam.id)}`)} /> : null}
        {session ? <Session kind="study" overdue={overtime} icon={<Headphones />} label={overtime ? 'بیشتر از زمان برنامه' : session.status === 'running' ? 'جلسه مطالعه' : 'مطالعه در مکث'} title={[task?.subject, task?.title].filter(Boolean).join(' · ') || 'فعالیت جاری'} meta={overtime ? `+${formatTime(elapsed - taskLimitSeconds)}` : formatTime(elapsed)} onOpen={() => go(`/plan?task=${encodeURIComponent(session.taskId)}`)} control={<button type="button" onClick={() => void (session.status === 'running' ? pause() : resume())} aria-label={session.status === 'running' ? 'مکث مطالعه' : 'ادامه مطالعه'}>{session.status === 'running' ? <Pause /> : <Play />}</button>} /> : null}
        {showAudio && selectedTrack ? <Session kind="audio" icon={audioBuffering ? <LoaderCircle /> : <Music2 />} label={audioBuffering ? 'در حال آماده‌سازی صوت' : audioPlaying ? 'در حال پخش' : 'پخش در مکث'} title={selectedTrack.title} meta={audioDuration > 0 ? `-${formatTime(audioDuration - audioCurrentTime)}` : undefined} onOpen={() => go('/more/audio')} control={<button type="button" onClick={() => void toggleAudio()} aria-label={audioPlaying || audioBuffering ? 'مکث صوت' : 'ادامه صوت'}>{audioBuffering ? <LoaderCircle /> : audioPlaying ? <Pause /> : <Play />}</button>} /> : null}
        {syncLabel !== 'آنلاین' ? <Session kind="sync" icon={<Cloud />} label="وضعیت داده‌ها" title={syncLabel} onOpen={() => go('/more#sync-status')} control={<span aria-label={syncLabel}>{syncLabel === 'همگام شد' ? <Check /> : <LoaderCircle />}</span>} /> : null}
      </div>
    </div> : null}
  </aside>;
}

function Session({ kind, icon, label, title, meta, onOpen, control, overdue = false }: { kind: ActivityKind; icon: ReactNode; label: string; title: string; meta?: string; onOpen(): void; control?: ReactNode; overdue?: boolean }) {
  return <section className={`island-session island-session--${kind} ${overdue ? 'is-overdue' : ''}`}>
    <button type="button" className="island-session__link" onClick={onOpen} aria-label={`${label}: ${title}`}>
      <span className="island-session__icon" aria-hidden="true">{icon}</span><span className="island-session__copy"><small>{label}</small><strong>{title}</strong>{meta ? <b dir="ltr">{meta}</b> : null}</span><ChevronLeft aria-hidden="true" />
    </button>
    {control ? <span className="island-session__control">{control}</span> : null}
  </section>;
}

function activityIcon(kind: ActivityKind, loading = false) {
  if (kind === 'exam') return <GraduationCap />;
  if (kind === 'study') return <Headphones />;
  if (kind === 'audio') return <Music2 />;
  return loading ? <LoaderCircle /> : <Cloud />;
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = value % 60;
  return [hours, minutes, rest].filter((_, index) => index > 0 || hours > 0).map((part) => String(part).padStart(2, '0')).join(':');
}

function plannedSeconds(start: string, end: string) {
  const parse = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0; };
  const startMinutes = parse(start); const endMinutes = parse(end);
  return Math.max(0, (endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes) * 60);
}
