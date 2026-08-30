import { X } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";
import { Button } from "./ui";

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
  onConfirm?: () => void | boolean | Promise<void | boolean>;
};

type ModalContextValue = {
  open: (options: ModalOptions) => void;
  close: () => void;
  confirm: (options: Omit<ModalOptions, "onConfirm">) => Promise<boolean>;
};

type ActiveModal = ModalOptions & { resolve?: (result: boolean) => void };
const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveModal | null>(null);
  const activeRef = useRef<ActiveModal | null>(null);

  const settle = useCallback((result: boolean) => {
    activeRef.current?.resolve?.(result);
    activeRef.current = null;
    setActive(null);
  }, []);

  const value = useMemo<ModalContextValue>(() => ({
    open(options) {
      activeRef.current?.resolve?.(false);
      const next = { dismissible: true, showCancel: false, size: "md" as const, ...options };
      activeRef.current = next;
      setActive(next);
    },
    close() { settle(false); },
    confirm(options) {
      activeRef.current?.resolve?.(false);
      return new Promise<boolean>((resolve) => {
        const next: ActiveModal = { dismissible: true, showCancel: true, size: "sm", confirmLabel: "تأیید", cancelLabel: "انصراف", ...options, resolve };
        activeRef.current = next;
        setActive(next);
      });
    },
  }), [settle]);

  return <ModalContext.Provider value={value}>{children}{active ? <ModalSurface modal={active} onCancel={() => settle(false)} onConfirm={() => settle(true)} /> : null}</ModalContext.Provider>;
}

function ModalSurface({ modal, onCancel, onConfirm }: { modal: ActiveModal; onCancel: () => void; onConfirm: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const dismissible = modal.dismissible !== false && !busy;

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => focusable(panelRef.current)[0]?.focus(), 0);
    return () => { document.body.style.overflow = previousOverflow; previousFocus.current?.focus(); };
  }, []);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) { event.preventDefault(); onCancel(); return; }
      if (event.key !== "Tab") return;
      const items = focusable(panelRef.current);
      if (!items.length) { event.preventDefault(); panelRef.current?.focus(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [dismissible, onCancel]);

  async function submit() {
    if (!modal.onConfirm) { onConfirm(); return; }
    setBusy(true);
    try { const result = await modal.onConfirm(); if (result !== false) onConfirm(); }
    finally { setBusy(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && dismissible) onCancel(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="global-modal-title" aria-describedby={modal.description ? "global-modal-description" : undefined} tabIndex={-1} className={cn("my-auto w-full rounded-xl border border-slate-200 bg-white text-ink shadow-2xl outline-none", modal.size === "sm" && "max-w-md", modal.size === "md" && "max-w-xl", modal.size === "lg" && "max-w-3xl", modal.size === "xl" && "max-w-5xl")}>
        <header className="flex items-start gap-4 border-b border-slate-200 px-5 py-4"><div className="min-w-0 flex-1"><h2 id="global-modal-title" className={cn("text-lg font-black", modal.tone === "danger" && "text-rosewood")}>{modal.title}</h2>{modal.description ? <div id="global-modal-description" className="mt-1 text-sm leading-6 text-slate-500">{modal.description}</div> : null}</div>{dismissible ? <button type="button" onClick={onCancel} aria-label="بستن پنجره" className="grid size-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"><X size={19} /></button> : null}</header>
        {modal.content ? <div className="max-h-[min(70vh,720px)] overflow-y-auto px-5 py-4">{modal.content}</div> : null}
        {(modal.showCancel || modal.confirmLabel || modal.onConfirm) ? <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4">{modal.showCancel ? <Button variant="soft" disabled={busy} onClick={onCancel}>{modal.cancelLabel || "انصراف"}</Button> : null}<Button variant={modal.tone === "danger" ? "danger" : "primary"} disabled={busy} onClick={() => void submit()}>{busy ? "در حال انجام…" : modal.confirmLabel || "تأیید"}</Button></footer> : null}
      </div>
    </div>,
    document.body,
  );
}

function focusable(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used inside ModalProvider");
  return context;
}
