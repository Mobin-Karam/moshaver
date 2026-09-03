import { clockActions } from "../lib/clock-store";
import { useClockStore } from "./useClockStore";

export function useWorldClocks() {
  const items = useClockStore().worldClocks;
  return {
    items,
    add: (label: string, timeZone: string) => clockActions.addWorldClock(label, timeZone),
    remove: (id: string) => clockActions.removeWorldClock(id),
  };
}
