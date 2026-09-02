import { useRef } from "react";
import { useStoredBoolean } from "./useStoredBoolean";

export function useNotificationSound() {
  const [
    soundEnabled,
    setSoundEnabled,
  ] = useStoredBoolean(
    "admin-notification-sound",
    true,
  );

  const [
    chatSoundEnabled,
    setChatSoundEnabled,
  ] = useStoredBoolean(
    "admin-chat-sound",
    true,
  );

  const lastSoundAt =
    useRef(0);

  function playSound(
    chat = false,
  ) {
    if (
      chat
        ? !chatSoundEnabled
        : !soundEnabled
    ) {
      return;
    }

    const now = Date.now();

    if (
      now -
        lastSoundAt.current <
      500
    ) {
      return;
    }

    lastSoundAt.current = now;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const context =
        new AudioContextClass();

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        chat ? 720 : 560,
        context.currentTime,
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        chat ? 920 : 760,
        context.currentTime +
          0.12,
      );

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.12,
        context.currentTime +
          0.02,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime +
          0.22,
      );

      oscillator
        .connect(gain)
        .connect(
          context.destination,
        );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          0.24,
      );

      oscillator.onended =
        () => {
          void context.close();
        };
    } catch {
      /* sound is optional */
    }
  }

  return {
    soundEnabled,
    chatSoundEnabled,
    setSoundEnabled,
    setChatSoundEnabled,
    playSound,
  };
}
