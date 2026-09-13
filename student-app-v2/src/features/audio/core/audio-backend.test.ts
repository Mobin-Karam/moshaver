import { afterEach, describe, expect, it, vi } from 'vitest';
import { HtmlAudioBackend } from './audio-backend';

class FakeAudio extends EventTarget {
  preload = ''; src = ''; paused = true; currentTime = 0; duration = 120; playbackRate = 1; readyState = 1;
  buffered = { length: 0, end: () => 0 };
  load = vi.fn();
  play = vi.fn(async () => { this.paused = false; this.dispatchEvent(new Event('playing')); });
  pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event('pause')); });
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
}

const OriginalAudio = globalThis.Audio;
afterEach(() => { globalThis.Audio = OriginalAudio; });

describe('HtmlAudioBackend streaming lifecycle', () => {
  it('uses one source and releases it when playback pauses', async () => {
    const instance = new FakeAudio();
    globalThis.Audio = vi.fn(() => instance) as unknown as typeof Audio;
    const backend = new HtmlAudioBackend();
    await backend.load({ id: 'one', title: 'صوت', artist: '', url: 'https://example.test/audio.mp3', active: true });
    await backend.play();
    expect(instance.src).toContain('audio.mp3');
    await backend.pause(true);
    expect(instance.removeAttribute).toHaveBeenCalledWith('src');
    expect(instance.load).toHaveBeenCalledTimes(2);
    expect(backend.getState().playback).toBe('paused');
  });
});
