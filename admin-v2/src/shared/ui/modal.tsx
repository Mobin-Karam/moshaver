import { X } from "lucide-react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";
import { Button } from "./ui";
import { SoftConfirmButton } from "./soft-confirmation-button";

export type ModalSize = "sm" | "md" | "lg" | "xl";
export type ModalTone = "default" | "danger";

export type ModalOptions = {
  title: ReactNode;
  description?: ReactNode;
  content?: ReactNode;

  size?: ModalSize;
  tone?: ModalTone;

  confirmLabel?: string;
  cancelLabel?: string;

  showCancel?: boolean;
  dismissible?: boolean;

  softConfirm?: boolean;
  softConfirmDuration?: number;

  // new
  softConfirmProgressColor?: string;
  softConfirmBackgroundColor?: string;

  onConfirm?: () => void | boolean | Promise<void | boolean>;
};

type ModalContextValue = {
  open: (options: ModalOptions) => void;
  close: () => void;
  confirm: (options: Omit<ModalOptions, "onConfirm">) => Promise<boolean>;
};

type ActiveModal = ModalOptions & {
  resolve?: (result: boolean) => void;
  parent?: ActiveModal | null;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveModal | null>(null);

  const activeRef = useRef<ActiveModal | null>(null);

  const settle = useCallback((result: boolean) => {
    const current = activeRef.current;

    current?.resolve?.(result);

    activeRef.current = current?.parent || null;

    setActive(current?.parent || null);
  }, []);

  const value = useMemo<ModalContextValue>(
    () => ({
      open(options) {
        activeRef.current?.resolve?.(false);

        const next = {
          dismissible: true,
          showCancel: false,
          size: "md" as const,
          ...options,
        };

        activeRef.current = next;

        setActive(next);
      },

      close() {
        settle(false);
      },

      confirm(options) {
        activeRef.current?.resolve?.(false);

        return new Promise<boolean>((resolve) => {
          const next: ActiveModal = {
            dismissible: true,
            showCancel: true,
            size: "sm",
            confirmLabel: "تأیید",
            cancelLabel: "انصراف",
            ...options,
            resolve,
            parent: activeRef.current,
          };

          activeRef.current = next;

          setActive(next);
        });
      },
    }),
    [settle],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}

      {active && (
        <ModalSurface
          modal={active}
          onCancel={() => settle(false)}
          onConfirm={() => settle(true)}
        />
      )}
    </ModalContext.Provider>
  );
}

function ModalSurface({
  modal,
  onCancel,
  onConfirm,
}: {
  modal: ActiveModal;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`);

  const previousFocus = useRef<HTMLElement | null>(null);

  const [busy, setBusy] = useState(false);

  const dismissible = modal.dismissible !== false && !busy;

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    setTimeout(() => {
      focusable(panelRef.current)[0]?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = overflow;

      previousFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusable(panelRef.current);

      if (!items.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keydown);

    return () => {
      document.removeEventListener("keydown", keydown);
    };
  }, [dismissible, onCancel]);

  async function submit() {
    if (!modal.onConfirm) {
      onConfirm();
      return;
    }

    setBusy(true);

    try {
      const result = await modal.onConfirm();

      if (result !== false) {
        onConfirm();
      }
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="
      fixed inset-0 z-[100]
      grid place-items-center
      overflow-y-auto
      bg-slate-950/55
      p-2 sm:p-4
      "
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) {
          onCancel();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        tabIndex={-1}
        className={cn(
          `
          my-auto flex
          max-h-[calc(100dvh-1rem)]
          w-full flex-col
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
          text-ink
          shadow-2xl
          outline-none
          `,
          modal.size === "sm" && "max-w-md",

          modal.size === "md" && "max-w-xl",

          modal.size === "lg" && "max-w-3xl",

          modal.size === "xl" && "max-w-5xl",
        )}
      >
        <header
          className="
flex items-start gap-4
border-b border-slate-200
px-5 py-4
"
        >
          <div className="flex-1">
            <h2
              id={titleId.current}
              className={cn(
                "text-lg font-black",
                modal.tone === "danger" && "text-rosewood",
              )}
            >
              {modal.title}
            </h2>

            {modal.description && (
              <div
                className="
mt-1 text-sm
leading-6 text-slate-500
"
              >
                {modal.description}
              </div>
            )}
          </div>

          {dismissible && (
            <button
              type="button"
              onClick={onCancel}
              className="
grid size-9
place-items-center
rounded-md
text-slate-500
hover:bg-slate-100
"
            >
              <X size={19} />
            </button>
          )}
        </header>

        {modal.content && (
          <div
            className="
min-h-0 flex-1
overflow-y-auto
px-4 py-4
"
          >
            {modal.content}
          </div>
        )}

        {(modal.showCancel || modal.confirmLabel || modal.onConfirm) && (
          <footer
            className="
flex justify-end gap-2
border-t
border-slate-200
bg-slate-50/70
px-5 py-4
"
          >
            {modal.showCancel && (
              <Button variant="soft" disabled={busy} onClick={onCancel}>
                {modal.cancelLabel || "انصراف"}
              </Button>
            )}

            {modal.softConfirm ? (
              <SoftConfirmButton
                duration={modal.softConfirmDuration ?? 3000}
                disabled={busy}
                onComplete={() => void submit()}
                variant={modal.tone === "danger" ? "danger" : "primary"}
                progressColor={modal.softConfirmProgressColor}
                backgroundColor={modal.softConfirmBackgroundColor}
              >
                {modal.confirmLabel || "نگه دارید"}
              </SoftConfirmButton>
            ) : (
              <Button
                loading={busy}
                variant={modal.tone === "danger" ? "danger" : "primary"}
                disabled={busy}
                onClick={() => void submit()}
              >
                {modal.confirmLabel || "تأیید"}
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>,

    document.body,
  );
}

function focusable(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      `
   button:not([disabled]),
   [href],
   input:not([disabled]),
   select:not([disabled]),
   textarea:not([disabled]),
   [tabindex]:not([tabindex="-1"])
   `,
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) throw new Error("useModal must be used inside ModalProvider");

  return context;
}
