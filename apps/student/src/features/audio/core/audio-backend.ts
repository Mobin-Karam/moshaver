export type PlaybackState = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';

export interface AudioTrack { id: string; title: string; artist: string; url: string; artworkUrl?: string; category?: string; active: boolean; }
export interface AudioBackendState { playback: PlaybackState; position: number; duration: number; bufferedPercent: number; speed: number; error: string | null; }
export interface AudioBackend {
  load(track: AudioTrack): Promise<void>;
  play(): Promise<void>;
  pause(releaseStreaming?: boolean): Promise<void>;
  stop(): Promise<void>;
  seek(position: number): Promise<void>;
  seekBy(seconds: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  getState(): AudioBackendState;
  subscribe(listener: (state: AudioBackendState) => void): () => void;
  destroy(): void;
}

const initial: AudioBackendState = { playback: 'idle', position: 0, duration: 0, bufferedPercent: 0, speed: 1, error: null };

export class HtmlAudioBackend implements AudioBackend {
  private readonly audio: HTMLAudioElement;
  private readonly listeners = new Set<(state: AudioBackendState) => void>();
  private state = { ...initial };
  private track: AudioTrack | null = null;
  private resumePosition = 0;
  private sourceAttached = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.addEventListener('playing', () => this.patch({ playback: 'playing', error: null }));
    this.audio.addEventListener('waiting', () => this.patch({ playback: 'buffering' }));
    this.audio.addEventListener('canplay', () => this.patch({ playback: this.audio.paused ? 'paused' : 'playing' }));
    this.audio.addEventListener('timeupdate', () => this.sync());
    this.audio.addEventListener('progress', () => this.sync());
    this.audio.addEventListener('durationchange', () => this.sync());
    this.audio.addEventListener('ended', () => { this.resumePosition = 0; this.patch({ playback: 'ended', position: 0 }); });
    this.audio.addEventListener('error', () => this.patch({ playback: 'error', error: 'این صوت در حال حاضر قابل پخش نیست.' }));
  }

  async load(track: AudioTrack) {
    if (this.track?.id === track.id) return;
    await this.stop();
    this.track = track;
    this.resumePosition = 0;
    this.patch({ playback: 'idle', position: 0, duration: 0, bufferedPercent: 0, error: null });
  }

  async play() {
    if (!this.track) return;
    if (!this.sourceAttached) {
      this.patch({ playback: 'loading', error: null });
      this.audio.src = this.track.url;
      this.sourceAttached = true;
      this.audio.load();
      if (this.resumePosition > 0) await this.waitForMetadata().then(() => { this.audio.currentTime = Math.min(this.resumePosition, this.audio.duration || this.resumePosition); });
    }
    await this.audio.play().catch((cause) => { this.patch({ playback: 'error', error: cause instanceof Error && cause.name === 'NotAllowedError' ? 'برای شروع پخش، دوباره دکمه پخش را لمس کنید.' : 'این صوت در حال حاضر قابل پخش نیست.' }); throw cause; });
  }

  async pause(releaseStreaming = true) {
    this.resumePosition = this.audio.currentTime || this.state.position;
    this.audio.pause();
    if (releaseStreaming) this.releaseSource();
    this.patch({ playback: 'paused', position: this.resumePosition, bufferedPercent: 0 });
  }

  async stop() { this.resumePosition = 0; this.audio.pause(); this.releaseSource(); this.patch({ playback: 'idle', position: 0, duration: 0, bufferedPercent: 0, error: null }); }
  async seek(position: number) { const safe = Math.max(0, Math.min(position, this.audio.duration || this.state.duration || position)); this.resumePosition = safe; if (this.sourceAttached) this.audio.currentTime = safe; this.patch({ position: safe }); }
  seekBy(seconds: number) { return this.seek(this.state.position + seconds); }
  async setSpeed(speed: number) { const safe = [0.75, 1, 1.25, 1.5, 2].includes(speed) ? speed : 1; this.audio.playbackRate = safe; this.patch({ speed: safe }); }
  getState() { return { ...this.state }; }
  subscribe(listener: (state: AudioBackendState) => void) { this.listeners.add(listener); listener(this.getState()); return () => this.listeners.delete(listener); }
  destroy() { void this.stop(); this.listeners.clear(); }

  private releaseSource() { if (!this.sourceAttached) return; this.audio.removeAttribute('src'); this.audio.load(); this.sourceAttached = false; }
  private patch(next: Partial<AudioBackendState>) { this.state = { ...this.state, ...next }; for (const listener of this.listeners) listener(this.getState()); }
  private sync() { const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : this.state.duration; let bufferedPercent = 0; if (duration && this.audio.buffered.length) bufferedPercent = Math.min(100, this.audio.buffered.end(this.audio.buffered.length - 1) / duration * 100); this.patch({ position: this.audio.currentTime || 0, duration: duration || 0, bufferedPercent }); }
  private waitForMetadata() { if (this.audio.readyState >= 1) return Promise.resolve(); return new Promise<void>((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const fail = () => { cleanup(); reject(new Error('metadata')); }; const cleanup = () => { this.audio.removeEventListener('loadedmetadata', done); this.audio.removeEventListener('error', fail); }; this.audio.addEventListener('loadedmetadata', done, { once: true }); this.audio.addEventListener('error', fail, { once: true }); }); }
}

let singleton: AudioBackend | null = null;
export function getAudioBackend(): AudioBackend | null { if (singleton) return singleton; if (typeof Audio === 'undefined') return null; singleton = new HtmlAudioBackend(); return singleton; }
