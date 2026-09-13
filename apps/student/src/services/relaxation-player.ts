import { create } from 'zustand';
import { type AudioTrack, getAudioBackend, type PlaybackState } from '../features/audio/core/audio-backend';
import { apiClient } from './api-client';

export interface RelaxationTrack extends AudioTrack {}
interface TodayRelaxation { date: string; selectedBy: 'AUTO' | 'STUDENT' | null; selected: RelaxationTrack | null; tracks: RelaxationTrack[]; }
interface ProgressRecord { position: number; duration: number; listenedAt: string; completed: boolean; }
interface Bookmark { id: string; trackId: string; position: number; note: string; createdAt: string; }
interface AudioPreferences { streamOnlyWhilePlaying: boolean; preloadNext: boolean; wifiDownloadsOnly: boolean; }
interface RelaxationState extends TodayRelaxation {
  status: 'idle' | 'loading' | 'ready' | 'error'; playback: PlaybackState; playing: boolean; buffering: boolean;
  currentTime: number; duration: number; bufferedPercent: number; speed: number; queue: RelaxationTrack[]; currentIndex: number;
  repeat: 'off' | 'one' | 'all'; shuffle: boolean; favorites: string[]; history: string[]; bookmarks: Bookmark[];
  sleepEndsAt: number | null; preferences: AudioPreferences; error: string | null;
  load(): Promise<void>; select(trackId: string): Promise<void>; playTrack(trackId: string): Promise<void>; toggle(): Promise<void>;
  seek(seconds: number): void; seekBy(seconds: number): void; stop(): void; next(): Promise<void>; previous(): Promise<void>;
  playNext(trackId: string): void; addToQueue(trackId: string): void; removeFromQueue(trackId: string): void; clearQueue(): void; moveQueue(trackId: string, direction: -1 | 1): void;
  setRepeat(repeat: 'off' | 'one' | 'all'): void; toggleShuffle(): void;
  setSpeed(speed: number): void; toggleFavorite(trackId?: string): void; addBookmark(note?: string): void; removeBookmark(id: string): void;
  setSleepTimer(minutes: number | null): void; setPreference<K extends keyof AudioPreferences>(key: K, value: AudioPreferences[K]): void;
}

const STORAGE = 'moshaver_v2_audio_library';
const defaults = { progress: {} as Record<string, ProgressRecord>, favorites: [] as string[], history: [] as string[], bookmarks: [] as Bookmark[], queueIds: [] as string[], speed: 1, repeat: 'off' as const, shuffle: false, preferences: { streamOnlyWhilePlaying: true, preloadNext: false, wifiDownloadsOnly: true } };
function readLibrary() { try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE) || '{}') } as typeof defaults; } catch { return defaults; } }
function writeLibrary(state: RelaxationState) { try { const previous = readLibrary(); localStorage.setItem(STORAGE, JSON.stringify({ ...previous, favorites: state.favorites, history: state.history.slice(0, 50), bookmarks: state.bookmarks, queueIds: state.queue.map((track) => track.id), speed: state.speed, repeat: state.repeat, shuffle: state.shuffle, preferences: state.preferences })); } catch { /* storage may be unavailable */ } }
function persistProgress(track: RelaxationTrack | null, position: number, duration: number, completed = false) { if (!track) return; try { const library = readLibrary(); library.progress[track.id] = { position, duration, completed, listenedAt: new Date().toISOString() }; localStorage.setItem(STORAGE, JSON.stringify(library)); } catch { /* storage may be unavailable */ } }

const library = typeof localStorage === 'undefined' ? defaults : readLibrary();
let sleepTimer: number | null = null;
let lastProgressSave = 0;
let subscribed = false;
function connectBackend() {
  const backend = getAudioBackend();
  if (!backend || subscribed) return backend;
  subscribed = true;
  backend.subscribe((state) => {
    const current = useRelaxationPlayer.getState();
    useRelaxationPlayer.setState({ playback: state.playback, playing: state.playback === 'playing', buffering: state.playback === 'loading' || state.playback === 'buffering', currentTime: state.position, duration: state.duration, bufferedPercent: state.bufferedPercent, speed: state.speed, error: state.error });
    if (Date.now() - lastProgressSave >= 8_000 && state.playback === 'playing') { lastProgressSave = Date.now(); persistProgress(current.selected, state.position, state.duration); }
    if (state.playback === 'ended') { persistProgress(current.selected, state.duration, state.duration, true); void useRelaxationPlayer.getState().next(); }
  });
  return backend;
}

export const useRelaxationPlayer = create<RelaxationState>((set, get) => ({
  date: '', selectedBy: null, selected: null, tracks: [], status: 'idle', playback: 'idle', playing: false, buffering: false, currentTime: 0, duration: 0, bufferedPercent: 0,
  speed: library.speed, queue: [], currentIndex: -1, repeat: library.repeat, shuffle: library.shuffle, favorites: library.favorites, history: library.history, bookmarks: library.bookmarks, sleepEndsAt: null, preferences: library.preferences, error: null,
  async load() { set({ status: 'loading', error: null }); try { const today = await apiClient.request<TodayRelaxation>('GET', '/student/relaxation/today'); const savedIds = readLibrary().queueIds; const persisted = savedIds.map((id) => today.tracks.find((track) => track.id === id)).filter((track): track is RelaxationTrack => Boolean(track)); const queue = [...persisted, ...today.tracks.filter((track) => !persisted.some((item) => item.id === track.id))]; const currentIndex = today.selected ? queue.findIndex((track) => track.id === today.selected?.id) : -1; set({ ...today, queue, currentIndex, status: 'ready' }); if (today.selected) await connectBackend()?.load(today.selected); setupMediaSession(); } catch (error) { set({ status: 'error', error: error instanceof Error ? error.message : 'دریافت فهرست صوتی ناموفق بود.' }); } },
  async select(trackId) { const previous = get().selected; const next = get().tracks.find((track) => track.id === trackId); if (!next) return; get().stop(); set({ selected: next, selectedBy: 'STUDENT', currentIndex: get().queue.findIndex((track) => track.id === next.id), error: null }); await connectBackend()?.load(next); try { set(await apiClient.request<TodayRelaxation, { trackId: string }>('PUT', '/student/relaxation/today', { trackId })); } catch (error) { set({ selected: previous, error: error instanceof Error ? error.message : 'انتخاب صوت ذخیره نشد.' }); throw error; } },
  async playTrack(trackId) { if (get().selected?.id !== trackId) await get().select(trackId); const track = get().selected; if (!track) return; const backend = connectBackend(); await backend?.load(track); const saved = readLibrary().progress[track.id]; if (saved?.position && !saved.completed) await backend?.seek(saved.position); await backend?.setSpeed(get().speed); await backend?.play(); set({ history: [track.id, ...get().history.filter((id) => id !== track.id)].slice(0, 50) }); writeLibrary(get()); updateMediaMetadata(track); },
  async toggle() { const backend = connectBackend(); const selected = get().selected; if (!backend || !selected) return; if (get().playing || get().buffering) { persistProgress(selected, get().currentTime, get().duration); await backend.pause(get().preferences.streamOnlyWhilePlaying); } else await get().playTrack(selected.id); },
  seek(seconds) { void connectBackend()?.seek(seconds); }, seekBy(seconds) { void connectBackend()?.seekBy(seconds); },
  stop() { persistProgress(get().selected, get().currentTime, get().duration); void connectBackend()?.stop(); set({ playback: 'idle', playing: false, buffering: false, currentTime: 0, duration: 0, bufferedPercent: 0 }); },
  async next() { const state = get(); if (!state.queue.length) return; if (state.repeat === 'one' && state.selected) { await connectBackend()?.seek(0); await connectBackend()?.play(); return; } const index = state.shuffle ? Math.floor(Math.random() * state.queue.length) : state.currentIndex + 1; if (index >= state.queue.length && state.repeat !== 'all') { state.stop(); return; } const next = state.queue[index % state.queue.length]; await state.playTrack(next.id); },
  async previous() { const state = get(); if (state.currentTime > 5) { state.seek(0); return; } if (!state.queue.length) return; const index = (state.currentIndex - 1 + state.queue.length) % state.queue.length; await state.playTrack(state.queue[index].id); },
  playNext(trackId) { const track = get().tracks.find((item) => item.id === trackId); if (!track) return; const queue = get().queue.filter((item) => item.id !== trackId); const insertAt = Math.max(0, get().currentIndex + 1); queue.splice(insertAt, 0, track); set({ queue }); writeLibrary(get()); },
  addToQueue(trackId) { const track = get().tracks.find((item) => item.id === trackId); if (!track || get().queue.some((item) => item.id === trackId)) return; set({ queue: [...get().queue, track] }); writeLibrary(get()); },
  removeFromQueue(trackId) { if (get().selected?.id === trackId) return; const queue = get().queue.filter((item) => item.id !== trackId); set({ queue, currentIndex: get().selected ? queue.findIndex((item) => item.id === get().selected?.id) : -1 }); writeLibrary(get()); },
  clearQueue() { const selected = get().selected; const queue = selected ? [selected] : []; set({ queue, currentIndex: selected ? 0 : -1 }); writeLibrary(get()); },
  moveQueue(trackId, direction) { const queue = [...get().queue]; const from = queue.findIndex((item) => item.id === trackId); const to = from + direction; if (from < 0 || to < 0 || to >= queue.length) return; [queue[from], queue[to]] = [queue[to], queue[from]]; set({ queue, currentIndex: get().selected ? queue.findIndex((item) => item.id === get().selected?.id) : -1 }); writeLibrary(get()); },
  setRepeat(repeat) { set({ repeat }); writeLibrary(get()); }, toggleShuffle() { set({ shuffle: !get().shuffle }); writeLibrary(get()); },
  setSpeed(speed) { void connectBackend()?.setSpeed(speed); set({ speed }); writeLibrary(get()); },
  toggleFavorite(trackId = get().selected?.id) { if (!trackId) return; const current = get().favorites; set({ favorites: current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId] }); writeLibrary(get()); },
  addBookmark(note = '') { const track = get().selected; if (!track) return; set({ bookmarks: [...get().bookmarks, { id: crypto.randomUUID(), trackId: track.id, position: get().currentTime, note, createdAt: new Date().toISOString() }] }); writeLibrary(get()); },
  removeBookmark(id) { set({ bookmarks: get().bookmarks.filter((item) => item.id !== id) }); writeLibrary(get()); },
  setSleepTimer(minutes) { if (sleepTimer) window.clearTimeout(sleepTimer); if (!minutes) { sleepTimer = null; set({ sleepEndsAt: null }); return; } const sleepEndsAt = Date.now() + minutes * 60_000; sleepTimer = window.setTimeout(() => { get().stop(); set({ sleepEndsAt: null }); }, minutes * 60_000); set({ sleepEndsAt }); },
  setPreference(key, value) { set({ preferences: { ...get().preferences, [key]: value } }); writeLibrary(get()); },
}));

function setupMediaSession() { if (!('mediaSession' in navigator)) return; navigator.mediaSession.setActionHandler('play', () => void useRelaxationPlayer.getState().toggle()); navigator.mediaSession.setActionHandler('pause', () => void useRelaxationPlayer.getState().toggle()); navigator.mediaSession.setActionHandler('seekbackward', (details) => useRelaxationPlayer.getState().seekBy(-(details.seekOffset || 15))); navigator.mediaSession.setActionHandler('seekforward', (details) => useRelaxationPlayer.getState().seekBy(details.seekOffset || 15)); navigator.mediaSession.setActionHandler('previoustrack', () => void useRelaxationPlayer.getState().previous()); navigator.mediaSession.setActionHandler('nexttrack', () => void useRelaxationPlayer.getState().next()); }
function updateMediaMetadata(track: RelaxationTrack) { if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return; navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist || 'مشاور', album: track.category || 'فهرست صوتی', artwork: track.artworkUrl ? [{ src: track.artworkUrl }] : undefined }); }
export function resetRelaxationPlayer() { useRelaxationPlayer.getState().stop(); useRelaxationPlayer.setState({ date: '', selectedBy: null, selected: null, tracks: [], queue: [], currentIndex: -1, status: 'idle', error: null }); }
