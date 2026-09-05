import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

type TriggerProps = {
  ref: (node: HTMLElement | null) => void;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
};

type ViewportPopoverProps = {
  trigger: (props: TriggerProps) => ReactNode;
  children: ReactNode;

  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  className?: string;
  width?: number;

  align?: "start" | "center" | "end";
};

export function ViewportPopover({
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  className,
  width = 320,
  align = "start",
}: ViewportPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;

  const anchor = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width,
    maxHeight: 320,
  });

  const change = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(next);
      }

      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const place = useCallback(() => {
    const triggerElement = anchor.current;

    if (!triggerElement) return;

    const rect = triggerElement.getBoundingClientRect();

    const margin = 8;
    const gap = 8;

    const calculatedWidth = Math.min(width, window.innerWidth - margin * 2);

    const panelHeight = panel.current?.getBoundingClientRect().height ?? 320;

    const belowSpace = window.innerHeight - rect.bottom - gap - margin;

    const aboveSpace = rect.top - gap - margin;

    const openBelow = belowSpace >= 180 || belowSpace >= aboveSpace;

    const maxHeight = Math.max(160, openBelow ? belowSpace : aboveSpace);

    let left = rect.left;

    if (align === "end") {
      left = rect.right - calculatedWidth;
    }

    if (align === "center") {
      left = rect.left + rect.width / 2 - calculatedWidth / 2;
    }

    if (document.documentElement.dir === "rtl" && align === "start") {
      left = rect.right - calculatedWidth;
    }

    left = Math.min(
      window.innerWidth - calculatedWidth - margin,
      Math.max(margin, left),
    );

    const top = openBelow
      ? rect.bottom + gap
      : Math.max(margin, rect.top - Math.min(panelHeight, maxHeight) - gap);

    setPosition({
      top,
      left,
      width: calculatedWidth,
      maxHeight,
    });
  }, [align, width]);

  useLayoutEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(place);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const outside = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !anchor.current?.contains(target) &&
        !panel.current?.contains(target)
      ) {
        change(false);
      }
    };

    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        change(false);
      }
    };

    const update = () => {
      place();
    };

    window.addEventListener("resize", update);

    window.addEventListener("scroll", update, true);

    document.addEventListener("pointerdown", outside);

    document.addEventListener("keydown", keyboard);

    const observer = new ResizeObserver(place);

    if (panel.current) {
      observer.observe(panel.current);
    }

    return () => {
      window.removeEventListener("resize", update);

      window.removeEventListener("scroll", update, true);

      document.removeEventListener("pointerdown", outside);

      document.removeEventListener("keydown", keyboard);

      observer.disconnect();
    };
  }, [open, place, change]);

  return (
    <>
      {trigger({
        ref(node) {
          anchor.current = node;
        },

        onClick() {
          change(!open);
        },

        "aria-expanded": open,

        "aria-haspopup": "dialog",
      })}

      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-modal="false"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className={cn(
              `
              z-[110]
              overflow-y-auto
              overscroll-contain
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-xl

              dark:border-slate-700
              dark:bg-slate-900
              `,
              className,
            )}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
