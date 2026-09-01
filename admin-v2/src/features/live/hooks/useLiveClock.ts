import {
  useEffect,
  useState,
} from "react";

export function useLiveClock() {
  const [clock, setClock] =
    useState(Date.now());

  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setClock(Date.now()),
        1000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, []);

  return clock;
}
