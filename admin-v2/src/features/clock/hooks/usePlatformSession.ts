import { useCallback, useEffect, useRef, useState } from "react";
import { loadPlatformSession, loadTabSession, savePlatformSession, saveTabSession } from "../lib/clock-storage";
import { getTodayKey } from "../lib/time";
import type { PlatformSessionStats } from "../model/clock.types";

const IDLE_AFTER_MS = 5 * 60_000;
const SAVE_INTERVAL_MS = 10_000;
const MAX_ACTIVE_TICK_MS = 2_500;

export function usePlatformSession(userId?: string): PlatformSessionStats {
  const persistedRef = useRef(loadPlatformSession(userId));
  const tabRef = useRef(loadTabSession(userId));
  const todayMsRef = useRef(persistedRef.current.todayMs);
  const totalMsRef = useRef(persistedRef.current.totalMs);
  const todayKeyRef = useRef(persistedRef.current.todayKey);
  const lastTickRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const idleRef = useRef(false);
  const lastExitAtRef = useRef(persistedRef.current.lastExitAt);

  const [stats, setStats] = useState<PlatformSessionStats>(() => ({
    currentSessionMs: tabRef.current.activeMs,
    todayMs: persistedRef.current.todayMs,
    totalMs: persistedRef.current.totalMs,
    enteredAt: tabRef.current.enteredAt,
    lastSeenAt: Date.now(),
    lastExitAt: persistedRef.current.lastExitAt,
    isActive: typeof document !== "undefined" ? document.visibilityState === "visible" && document.hasFocus() : false,
    isIdle: false,
  }));

  const persist = useCallback((markExit = false) => {
    const now = Date.now();
    if (markExit) lastExitAtRef.current = now;
    const payload = {
      version: 2 as const,
      todayKey: todayKeyRef.current,
      todayMs: todayMsRef.current,
      totalMs: totalMsRef.current,
      lastSeenAt: now,
      lastExitAt: lastExitAtRef.current,
    };
    savePlatformSession(payload, userId);
    saveTabSession(tabRef.current, userId);
  }, [userId]);

  useEffect(() => {
    const registerActivity = () => {
      lastActivityRef.current = Date.now();
      if (idleRef.current) {
        idleRef.current = false;
        lastTickRef.current = Date.now();
      }
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"];
    events.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, registerActivity));
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const currentTodayKey = getTodayKey();
      if (todayKeyRef.current !== currentTodayKey) {
        todayKeyRef.current = currentTodayKey;
        todayMsRef.current = 0;
      }

      const elapsed = Math.min(Math.max(0, now - lastTickRef.current), MAX_ACTIVE_TICK_MS);
      lastTickRef.current = now;
      const idle = now - lastActivityRef.current >= IDLE_AFTER_MS;
      const active = document.visibilityState === "visible" && document.hasFocus() && !idle;
      idleRef.current = idle;

      if (active) {
        tabRef.current.activeMs += elapsed;
        todayMsRef.current += elapsed;
        totalMsRef.current += elapsed;
      }

      setStats({
        currentSessionMs: tabRef.current.activeMs,
        todayMs: todayMsRef.current,
        totalMs: totalMsRef.current,
        enteredAt: tabRef.current.enteredAt,
        lastSeenAt: now,
        lastExitAt: lastExitAtRef.current,
        isActive: active,
        isIdle: idle,
      });
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    const syncLatest = () => {
      const latest = loadPlatformSession(userId);
      if (latest.todayKey === todayKeyRef.current) todayMsRef.current = Math.max(todayMsRef.current, latest.todayMs);
      totalMsRef.current = Math.max(totalMsRef.current, latest.totalMs);
      lastExitAtRef.current = latest.lastExitAt;
    };
    const handleVisibility = () => {
      tick();
      if (document.visibilityState === "hidden") persist(false);
      else { syncLatest(); lastTickRef.current = Date.now(); }
    };
    const handleFocus = () => { syncLatest(); lastTickRef.current = Date.now(); tick(); };
    const handleBlur = () => { tick(); persist(false); lastTickRef.current = Date.now(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [persist, userId]);

  useEffect(() => {
    const interval = window.setInterval(() => persist(false), SAVE_INTERVAL_MS);
    const handlePageHide = () => persist(true);
    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.includes("ravin:clock:session:v2")) return;
      const latest = loadPlatformSession(userId);
      if (latest.todayKey === todayKeyRef.current) todayMsRef.current = Math.max(todayMsRef.current, latest.todayMs);
      totalMsRef.current = Math.max(totalMsRef.current, latest.totalMs);
      lastExitAtRef.current = latest.lastExitAt;
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("storage", handleStorage);
      persist(false);
    };
  }, [persist, userId]);

  return stats;
}
