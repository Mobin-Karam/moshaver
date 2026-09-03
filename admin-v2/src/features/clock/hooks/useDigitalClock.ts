import { useLiveNow } from "./useLiveNow";

export function useDigitalClock() {
  return new Date(useLiveNow(1000));
}
