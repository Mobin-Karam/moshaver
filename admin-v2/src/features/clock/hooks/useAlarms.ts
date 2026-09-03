import { clockActions } from "../lib/clock-store";
import { requestClockNotificationPermission } from "../lib/notifications";
import type { AlarmItem } from "../model/clock.types";
import { useClockStore } from "./useClockStore";

export function useAlarms() {
  const store = useClockStore();

  return {
    alarms: store.alarms,
    activeAlarm: store.activeAlarm,
    addAlarm: async (input: Pick<AlarmItem, "hour" | "minute" | "label" | "repeatDays" | "snoozeMinutes">) => {
      await requestClockNotificationPermission();
      clockActions.addAlarm(input);
    },
    updateAlarm: clockActions.updateAlarm,
    toggleAlarm: clockActions.toggleAlarm,
    removeAlarm: clockActions.removeAlarm,
    dismiss: clockActions.dismissActiveAlarm,
    snooze: clockActions.snoozeActiveAlarm,
  };
}
