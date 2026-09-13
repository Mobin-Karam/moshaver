import { afterEach, describe, expect, it } from 'vitest';
import { useRelaxationPlayer, type RelaxationTrack } from './relaxation-player';

const tracks: RelaxationTrack[] = [
  { id: 'one', title: 'یک', artist: 'مشاور', url: 'https://example.test/one.mp3', active: true },
  { id: 'two', title: 'دو', artist: 'مشاور', url: 'https://example.test/two.mp3', active: true },
  { id: 'three', title: 'سه', artist: 'مشاور', url: 'https://example.test/three.mp3', active: true },
];

afterEach(() => {
  localStorage.clear();
  useRelaxationPlayer.setState({ selected: null, tracks: [], queue: [], currentIndex: -1, playback: 'idle', playing: false, buffering: false });
});

describe('relaxation queue', () => {
  it('supports play-next, reorder, remove and clear without removing the current track', () => {
    useRelaxationPlayer.setState({ tracks, queue: [tracks[0], tracks[1]], selected: tracks[0], currentIndex: 0 });
    const player = useRelaxationPlayer.getState();
    player.playNext('three');
    expect(useRelaxationPlayer.getState().queue.map((track) => track.id)).toEqual(['one', 'three', 'two']);
    useRelaxationPlayer.getState().moveQueue('two', -1);
    expect(useRelaxationPlayer.getState().queue.map((track) => track.id)).toEqual(['one', 'two', 'three']);
    useRelaxationPlayer.getState().removeFromQueue('two');
    expect(useRelaxationPlayer.getState().queue.map((track) => track.id)).toEqual(['one', 'three']);
    useRelaxationPlayer.getState().removeFromQueue('one');
    expect(useRelaxationPlayer.getState().queue.map((track) => track.id)).toContain('one');
    useRelaxationPlayer.getState().clearQueue();
    expect(useRelaxationPlayer.getState().queue.map((track) => track.id)).toEqual(['one']);
  });
});
