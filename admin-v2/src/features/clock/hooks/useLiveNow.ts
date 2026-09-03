import { useEffect, useState } from "react";

export function useLiveNow(resolutionMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let interval: number | undefined;
    const safeResolution = Math.max(50, resolutionMs);
    const syncDelay = safeResolution - (Date.now() % safeResolution);
    const timeout = window.setTimeout(() => {
      setNow(Date.now());
      interval = window.setInterval(() => setNow(Date.now()), safeResolution);
    }, syncDelay);

    const refresh = () => setNow(Date.now());
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearTimeout(timeout);
      if (interval != null) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [resolutionMs]);

  return now;
}
