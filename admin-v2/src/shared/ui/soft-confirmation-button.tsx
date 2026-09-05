import { Check, LoaderCircle, ShieldAlert } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

type Variant = "primary" | "danger";

type State = "idle" | "holding" | "success";

type Props = {
  duration?: number;

  disabled?: boolean;

  loading?: boolean;

  children: React.ReactNode;

  variant?: Variant;

  progressColor?: string;

  backgroundColor?: string;

  progressLabel?: string;

  successLabel?: string;

  onComplete: () => void;
};

function toPersianNumber(value: number) {
  const numbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  return String(value).replace(/\d/g, (d) => numbers[Number(d)]);
}

function formatSeconds(seconds: number) {
  return toPersianNumber(Math.ceil(seconds));
}

export function SoftConfirmButton({
  duration = 3000,

  disabled,

  loading,

  children,

  variant = "primary",

  progressColor,

  backgroundColor,

  progressLabel = "برای تأیید نگه دارید",

  successLabel = "انجام شد",

  onComplete,
}: Props) {
  const [progress, setProgress] = useState(0);

  const [state, setState] = useState<State>("idle");

  const timer = useRef<number | null>(null);

  const start = useRef(0);

  function startHolding() {
    if (disabled || loading || state === "success") return;

    navigator.vibrate?.(15);

    setState("holding");

    start.current = Date.now();

    timer.current = window.setInterval(() => {
      const elapsed = Date.now() - start.current;

      const value = Math.min(elapsed / duration, 1);

      setProgress(value);

      if (value >= 1) {
        complete();
      }
    }, 16);
  }

  function complete() {
    stopTimer();

    setProgress(1);

    setState("success");

    navigator.vibrate?.([50, 30, 50]);

    onComplete();

    setTimeout(() => {
      setProgress(0);

      setState("idle");
    }, 1200);
  }

  function cancel() {
    stopTimer();

    if (state === "holding") {
      setState("idle");

      setProgress(0);
    }
  }

  function stopTimer() {
    if (timer.current) {
      clearInterval(timer.current);

      timer.current = null;
    }
  }

  useEffect(() => {
    return stopTimer;
  }, []);

  const width = 160;

  const height = 40;

  const radius = 8;

  const stroke = 4;

  const perimeter =
    2 * (width - radius * 2 + height - radius * 2) + 2 * Math.PI * radius;

  const offset = perimeter - progress * perimeter;

  const secondsLeft = (duration / 1000) * (1 - progress);

  const holding = state === "holding";

  return (
    <div
      className="
 relative
 inline-flex
 overflow-visible
 "
    >
      {/* outside progress */}

      <svg
        className="
 absolute
 -inset-[4px]
 w-[calc(100%+8px)]
 h-[calc(100%+8px)]
 pointer-events-none
 z-20
 "
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <rect
          x="2"
          y="2"
          width={width - 4}
          height={height - 4}
          rx={radius}
          fill="none"
          stroke={backgroundColor ?? "rgba(148,163,184,.55)"}
          strokeWidth={stroke}
        />

        <rect
          x="2"
          y="2"
          width={width - 4}
          height={height - 4}
          rx={radius}
          fill="none"
          stroke={
            progressColor ?? (variant === "danger" ? "#fecdd3" : "#5eead4")
          }
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={perimeter}
          strokeDashoffset={offset}
        />
      </svg>

      <button
        type="button"
        disabled={disabled || loading}
        onMouseDown={startHolding}
        onMouseUp={cancel}
        onMouseLeave={cancel}
        onTouchStart={startHolding}
        onTouchEnd={cancel}
        className={cn(
          `
 relative
 flex
 min-h-10
 items-center
 justify-center
 rounded-lg
 px-5
 py-2
 font-bold
 text-white
 overflow-hidden
 transition-all
 duration-200
 z-10
 `,

          holding &&
            `
 scale-[0.97]
 brightness-75
 `,

          state === "success" && "bg-emerald-600",

          variant === "danger" && state !== "success" && "bg-rose-600",

          variant === "primary" && state !== "success" && "bg-teal-700",

          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {holding && (
          <span
            className="
  absolute
  inset-0
  bg-black/20
  "
          />
        )}

        <span
          className="
 relative
 z-10
 flex
 items-center
 gap-2
 "
        >
          {loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : state === "success" ? (
            <>
              <Check size={17} />
              {successLabel}
            </>
          ) : holding ? (
            <>
              <ShieldAlert size={16} />
              {progressLabel} {formatSeconds(secondsLeft)}
            </>
          ) : (
            children
          )}
        </span>
      </button>
    </div>
  );
}
