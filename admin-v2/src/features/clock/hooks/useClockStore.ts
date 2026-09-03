import { useSyncExternalStore } from "react";
import { getClockServerSnapshot, getClockStoreSnapshot, subscribeClockStore } from "../lib/clock-store";

export function useClockStore() {
  return useSyncExternalStore(subscribeClockStore, getClockStoreSnapshot, getClockServerSnapshot);
}
