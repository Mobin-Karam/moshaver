import { remainingServerSeconds, type QuizRun } from '@moshaver/student-core';
import { useEffect, useState } from 'react';

export function useRemainingSeconds(run: QuizRun, receivedAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (run.deadlineAt && run.serverTime) {
    return remainingServerSeconds(
      { deadlineAt: run.deadlineAt, serverTime: run.serverTime, receivedAt },
      now,
    );
  }
  const elapsed = Math.floor((now - receivedAt) / 1000);
  return Math.max(0, (run.remainingSeconds ?? 0) - elapsed);
}
