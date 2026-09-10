import { create } from 'zustand';
import { apiClient } from './api-client';

export interface RelaxationTrack { id: string; title: string; artist: string; url: string; active: boolean; }
interface TodayRelaxation { date: string; selectedBy: 'AUTO' | 'STUDENT' | null; selected: RelaxationTrack | null; tracks: RelaxationTrack[]; }
interface RelaxationState extends TodayRelaxation {
  status: 'idle' | 'loading' | 'ready' | 'error';
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  bufferedPercent: number;
  error: string | null;
  load(): Promise<void>;
  select(trackId: string): Promise<void>;
  toggle(): Promise<void>;
  seek(seconds: number): void;
  stop(): void;
}

let audio: HTMLAudioElement | null = null;
function player() {
  if (audio || typeof Audio === 'undefined') return audio;
  audio = new Audio();
  audio.preload = 'metadata';
  audio.addEventListener('playing', () => useRelaxationPlayer.setState({ playing: true, buffering: false, error: null }));
  audio.addEventListener('pause', () => useRelaxationPlayer.setState({ playing: false }));
  audio.addEventListener('waiting', () => useRelaxationPlayer.setState({ buffering: true }));
  audio.addEventListener('canplay', () => useRelaxationPlayer.setState({ buffering: false }));
  audio.addEventListener('timeupdate', syncAudioState);
  audio.addEventListener('progress', syncAudioState);
  audio.addEventListener('durationchange', syncAudioState);
  audio.addEventListener('ended', () => useRelaxationPlayer.setState({ playing: false, currentTime: 0 }));
  audio.addEventListener('error', () => useRelaxationPlayer.setState({ playing: false, buffering: false, error: 'پخش موسیقی ممکن نشد؛ پیوند یا اتصال اینترنت را بررسی کنید.' }));
  return audio;
}

function syncAudioState() {
  if (!audio) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  let buffered = 0;
  if (duration && audio.buffered.length) buffered = Math.min(100, (audio.buffered.end(audio.buffered.length - 1) / duration) * 100);
  useRelaxationPlayer.setState({ currentTime: audio.currentTime || 0, duration, bufferedPercent: buffered });
}

export const useRelaxationPlayer = create<RelaxationState>((set, get) => ({
  date: '', selectedBy: null, selected: null, tracks: [], status: 'idle', playing: false, buffering: false, currentTime: 0, duration: 0, bufferedPercent: 0, error: null,
  async load() {
    set({ status: 'loading', error: null });
    try { set({ ...(await apiClient.request<TodayRelaxation>('GET', '/student/relaxation/today')), status: 'ready' }); }
    catch (error) { set({ status: 'error', error: error instanceof Error ? error.message : 'دریافت موسیقی امروز ناموفق بود.' }); }
  },
  async select(trackId) {
    const previous = get().selected;
    const next = get().tracks.find((track) => track.id === trackId);
    if (!next) return;
    get().stop();
    set({ selected: next, selectedBy: 'STUDENT', error: null });
    try { set(await apiClient.request<TodayRelaxation, { trackId: string }>('PUT', '/student/relaxation/today', { trackId })); }
    catch (error) { set({ selected: previous, error: error instanceof Error ? error.message : 'انتخاب موسیقی ذخیره نشد.' }); throw error; }
  },
  async toggle() {
    const selected = get().selected;
    const instance = player();
    if (!selected || !instance) return;
    if (instance.src !== selected.url) { instance.src = selected.url; instance.load(); set({ currentTime: 0, duration: 0, bufferedPercent: 0, buffering: true }); }
    if (instance.paused) await instance.play().catch(() => set({ error: 'مرورگر اجازه پخش این پیوند را نداد.' })); else instance.pause();
  },
  seek(seconds) { const instance = player(); if (instance && Number.isFinite(seconds)) instance.currentTime = Math.max(0, Math.min(seconds, instance.duration || seconds)); },
  stop() { const instance = player(); if (instance) { instance.pause(); instance.removeAttribute('src'); instance.load(); } set({ playing: false, buffering: false, currentTime: 0, duration: 0, bufferedPercent: 0 }); },
}));

export function resetRelaxationPlayer() { useRelaxationPlayer.getState().stop(); useRelaxationPlayer.setState({ date: '', selectedBy: null, selected: null, tracks: [], status: 'idle', error: null }); }
