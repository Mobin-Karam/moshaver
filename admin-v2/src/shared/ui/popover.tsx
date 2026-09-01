import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

type TriggerProps = { ref: (node: HTMLElement | null) => void; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "dialog" };

export function ViewportPopover({ trigger, children, open: controlledOpen, onOpenChange, className, width = 320 }: { trigger: (props: TriggerProps) => ReactNode; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; width?: number }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const anchor = useRef<HTMLElement | null>(null), panel = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 320, ready: false });
  const change = useCallback((next: boolean) => { if (controlledOpen === undefined) setInternalOpen(next); onOpenChange?.(next); }, [controlledOpen, onOpenChange]);
  const place = useCallback(() => {
    if (!anchor.current || !panel.current) return;
    const gap = 8, margin = 8, rect = anchor.current.getBoundingClientRect(), panelWidth = Math.min(width, window.innerWidth - margin * 2), panelHeight = panel.current.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin, spaceAbove = rect.top - gap - margin, below = spaceBelow >= Math.min(panelHeight, 260) || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(160, below ? spaceBelow : spaceAbove);
    const preferredLeft = document.documentElement.dir === "rtl" ? rect.right - panelWidth : rect.left;
    const left = Math.min(window.innerWidth - panelWidth - margin, Math.max(margin, preferredLeft));
    const top = below ? rect.bottom + gap : Math.max(margin, rect.top - Math.min(panelHeight, maxHeight) - gap);
    setPosition({ top, left, maxHeight, ready: true });
  }, [width]);
  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => { if (!open) return; const update = () => place(); const close = (event: PointerEvent) => { const target = event.target as Node; if (!anchor.current?.contains(target) && !panel.current?.contains(target)) change(false); }; const key = (event: KeyboardEvent) => { if (event.key === "Escape") change(false); }; window.addEventListener("resize", update); window.addEventListener("scroll", update, true); document.addEventListener("pointerdown", close); document.addEventListener("keydown", key); return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); }; }, [open, place, change]);
  return <>{trigger({ ref: (node) => { anchor.current = node; }, onClick: () => change(!open), "aria-expanded": open, "aria-haspopup": "dialog" })}{open ? createPortal(<div ref={panel} role="dialog" style={{ position: "fixed", top: position.top, left: position.left, width: Math.min(width, window.innerWidth - 16), maxHeight: position.maxHeight }} className={cn("z-[110] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl", !position.ready && "invisible", className)}>{children}</div>, document.body) : null}</>;
}
