import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronUp, Cloud, GraduationCap, Headphones, LoaderCircle, Music2, Pause, Play } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../services/student-store';
import { useRelaxationPlayer } from '../../services/relaxation-player';

export function ActivityIsland({ syncLabel }: { syncLabel: string }) {
  const session = useStudentStore((state) => state.activeSession);
  const tasks = useStudentStore((state) => state.plan.tasks);
  const exams = useStudentStore((state) => state.exams);
  const pause = useStudentStore((state) => state.pauseFocus);
  const resume = useStudentStore((state) => state.resumeFocus);
  const selectedTrack = useRelaxationPlayer((state) => state.selected);
  const musicPlaying = useRelaxationPlayer((state) => state.playing);
  const musicBuffering = useRelaxationPlayer((state) => state.buffering);
  const musicDuration = useRelaxationPlayer((state) => state.duration);
  const musicCurrentTime = useRelaxationPlayer((state) => state.currentTime);
  const bufferedPercent = useRelaxationPlayer((state) => state.bufferedPercent);
  const toggleMusic = useRelaxationPlayer((state) => state.toggle);
  const navigate = useNavigate();
  const location = useLocation();
  const root = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const task = tasks.find((item) => item.id === session?.taskId);
  const activeExam = exams.find((item) => Boolean(item.delivery?.activeAttemptId) || item.delivery?.state === 'active');
  const elapsed = session ? session.elapsedSeconds + (session.status === 'running' ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000)) : 0) : 0;
  const kinds = useMemo(() => [activeExam ? 'exam' : null, session ? 'study' : null, selectedTrack && (musicPlaying || musicBuffering) ? 'music' : null, syncLabel !== 'آنلاین' ? 'sync' : null].filter((value): value is 'exam' | 'study' | 'music' | 'sync' => Boolean(value)), [activeExam, musicBuffering, musicPlaying, selectedTrack, session, syncLabel]);

  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { setExpanded(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setExpanded(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setExpanded(false); root.current?.querySelector<HTMLButtonElement>('.activity-island__summary')?.focus(); } };
    document.addEventListener('pointerdown', closeOutside); document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [expanded]);

  function go(path: string) { setExpanded(false); navigate(path); }
  const primarySummary = activeExam ? activeExam.title : session ? `${task?.subject || task?.title || 'مطالعه'} · ${formatTime(elapsed)}` : selectedTrack ? selectedTrack.title : syncLabel;
  const summary = !kinds.length ? 'فعالیتی در حال اجرا نیست' : kinds.length > 1 ? `${primarySummary} · ${kinds.length.toLocaleString('fa-IR')} فعالیت` : primarySummary;

  return <aside ref={root} className={`activity-island ${expanded ? 'is-expanded' : ''}`} aria-label="فعالیت‌های در حال اجرا">
    <button type="button" className="activity-island__summary" onClick={() => kinds.length && setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="activity-island-sessions">
      <span className="activity-island__dots">{kinds.length ? kinds.map((kind) => <i key={kind} className={`activity-dot activity-dot--${kind}`} aria-hidden="true">{kind === 'exam' ? <GraduationCap /> : kind === 'study' ? <Headphones /> : kind === 'music' ? <Music2 /> : <Cloud />}</i>) : <i className="activity-dot activity-dot--idle" aria-hidden="true" />}</span>
      <span className="activity-island__summary-text">{summary}</span>
      {kinds.length ? <ChevronUp className="activity-island__chevron" /> : null}
    </button>
    {musicBuffering ? <span className="activity-island__buffer" style={{ inlineSize: `${Math.max(8, bufferedPercent)}%` }} aria-hidden="true" /> : null}
    {expanded ? <div className="activity-island__details" id="activity-island-sessions">
      {activeExam ? <section className="island-session island-session--exam"><button type="button" className="island-session__link" onClick={() => go(`/exam?exam=${encodeURIComponent(activeExam.id)}`)}><span className="island-session__icon"><GraduationCap /></span><span><small>آزمون در حال اجرا</small><strong>{activeExam.title}</strong><b>ادامه آزمون</b></span><ChevronLeft /></button></section> : null}
      {session ? <section className="island-session island-session--study"><button type="button" className="island-session__link" onClick={() => go(`/plan?task=${encodeURIComponent(session.taskId)}`)}><span className="island-session__icon"><Headphones /></span><span><small>جلسه مطالعه</small><strong>{[task?.subject, task?.title].filter(Boolean).join(' · ') || 'فعالیت جاری'}</strong><b dir="ltr">{formatTime(elapsed)}</b></span><ChevronLeft /></button><button type="button" className="island-session__control" onClick={() => void (session.status === 'running' ? pause() : resume())} aria-label={session.status === 'running' ? 'مکث مطالعه' : 'ادامه مطالعه'}>{session.status === 'running' ? <Pause /> : <Play />}</button></section> : null}
      {selectedTrack && (musicPlaying || musicBuffering) ? <section className="island-session island-session--music"><button type="button" className="island-session__link" onClick={() => go('/more#relaxation-title')}><span className="island-session__icon">{musicBuffering ? <LoaderCircle /> : <Music2 />}</span><span><small>{musicBuffering ? 'در حال آماده‌سازی پخش' : 'آرامش امروز'}</small><strong>{selectedTrack.title}</strong><b dir="ltr">-{formatTime(Math.max(0, musicDuration - musicCurrentTime))}</b></span><ChevronLeft /></button><button type="button" className="island-session__control" onClick={() => void toggleMusic()} aria-label={musicPlaying ? 'مکث موسیقی' : 'ادامه موسیقی'}>{musicPlaying ? <Pause /> : <Play />}</button></section> : null}
      {syncLabel !== 'آنلاین' ? <section className="island-session island-session--sync"><button type="button" className="island-session__link" onClick={() => go('/more#sync-status')}><span className="island-session__icon"><Cloud /></span><span><small>وضعیت داده‌ها</small><strong>{syncLabel}</strong></span><ChevronLeft /></button><span className="island-session__status">{syncLabel === 'همگام شد' ? <Check /> : <LoaderCircle />}</span></section> : null}
    </div> : null}
  </aside>;
}

function formatTime(seconds: number) { const value = Math.max(0, Math.floor(seconds)); const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); const rest = value % 60; return [hours, minutes, rest].filter((_, index) => index > 0 || hours > 0).map((part) => String(part).padStart(2, '0')).join(':'); }
