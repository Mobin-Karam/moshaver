import { clockActions } from "../lib/clock-store";
import { getStopwatchElapsed } from "../lib/time";
import { useClockStore } from "./useClockStore";
import { useLiveNow } from "./useLiveNow";

export function useStopwatch(resolutionMs = 100) {
  const state = useClockStore().stopwatch;
  const now = useLiveNow(state.running ? resolutionMs : 1000);
  const elapsedMs = getStopwatchElapsed(state, now);

  return {
    ...state,
    elapsedMs,
    start: () => clockActions.startStopwatch(),
    pause: () => clockActions.pauseStopwatch(),
    reset: () => clockActions.resetStopwatch(),
    lap: () => clockActions.addStopwatchLap(),
  };
}
