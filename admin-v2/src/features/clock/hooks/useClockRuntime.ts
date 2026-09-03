import { useEffect, useRef } from "react";
import { getClockStoreSnapshot, processClockRuntime, subscribeClockStore } from "../lib/clock-store";
import { playClockTone, showClockNotification } from "../lib/notifications";

export function useClockRuntime() {
  const previousTimerStatus = useRef(getClockStoreSnapshot().timer.status);
  const previousActiveAlarm = useRef(getClockStoreSnapshot().activeAlarm?.startedAt ?? null);

  useEffect(() => {
    const handleStoreChange = () => {
      const store = getClockStoreSnapshot();

      if (previousTimerStatus.current !== "finished" && store.timer.status === "finished") {
        showClockNotification("تایمر پایان یافت", "زمان تنظیم‌شده تمام شد.");
        if (store.preferences.soundEnabled) playClockTone("timer");
      }
      previousTimerStatus.current = store.timer.status;

      const activeStartedAt = store.activeAlarm?.startedAt ?? null;
      if (activeStartedAt && activeStartedAt !== previousActiveAlarm.current) {
        const alarm = store.alarms.find((item) => item.id === store.activeAlarm?.alarmId);
        showClockNotification(alarm?.label || "هشدار", `${String(alarm?.hour ?? 0).padStart(2, "0")}:${String(alarm?.minute ?? 0).padStart(2, "0")}`);
        if (store.preferences.soundEnabled) playClockTone("alarm");
      }
      previousActiveAlarm.current = activeStartedAt;
    };

    const unsubscribe = subscribeClockStore(handleStoreChange);
    const process = () => processClockRuntime(Date.now());
    process();
    const interval = window.setInterval(process, 1000);
    document.addEventListener("visibilitychange", process);
    window.addEventListener("focus", process);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", process);
      window.removeEventListener("focus", process);
    };
  }, []);
}
