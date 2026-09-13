import { clockActions } from "../lib/clock-store";
import { getTimerRemaining } from "../lib/time";
import { requestClockNotificationPermission } from "../lib/notifications";
import { useClockStore } from "./useClockStore";
import { useLiveNow } from "./useLiveNow";

export function useCountdownTimer(resolutionMs = 250) {
  const state = useClockStore().timer;
  const now = useLiveNow(state.status === "running" ? resolutionMs : 1000);
  const remainingMs = getTimerRemaining(state, now);

  return {
    ...state,
    remainingMs,
    setDurationMs: (durationMs: number) => clockActions.setTimerDuration(durationMs),
    start: async () => {
      await requestClockNotificationPermission();
      clockActions.startTimer();
    },
    pause: () => clockActions.pauseTimer(),
    reset: () => clockActions.resetTimer(),
  };
}
