import { Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import { Card, Input } from "./ui";

export function ManagementPageHeader({ eyebrow = "مدیریت", title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold text-brand">{eyebrow}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-ink">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div>{action ? <div className="shrink-0">{action}</div> : null}</header>;
}

export function ManagementSummaryBar({ children, action, label = "خلاصه و فیلترها" }: { children: ReactNode; action?: ReactNode; label?: string }) {
  return <section className="flex flex-wrap items-center justify-between gap-3" aria-label={label}><div className="flex flex-wrap items-center gap-2">{children}</div>{action ? <div className="shrink-0">{action}</div> : null}</section>;
}

export function ManagementStat({ label, value, active = false, tone = "brand", onClick }: { label: string; value: number; active?: boolean; tone?: "brand"|"success"|"muted"; onClick?: () => void }) {
  const className = cn("inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition", active ? "border-brand bg-brand text-white shadow-sm" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-600 hover:border-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300");
  const content = <><strong className="text-base">{value.toLocaleString("fa-IR")}</strong><span>{label}</span></>;
  return onClick ? <button type="button" className={className} aria-pressed={active} onClick={onClick}>{content}</button> : <span className={className}>{content}</span>;
}

export function ManagementSearch({ value, onChange, placeholder, resultLabel }: { value: string; onChange: (value: string) => void; placeholder: string; resultLabel?: ReactNode }) {
  return <Card className="p-3 sm:p-4"><div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><Input className="pr-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/></div>{resultLabel ? <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">{resultLabel}</div> : null}</Card>;
}

export function ManagementMasterDetail({ directory, detail, directoryVisible = true, detailVisible = true, detailWidth = "minmax(420px,.75fr)" }: { directory: ReactNode; detail: ReactNode; directoryVisible?: boolean; detailVisible?: boolean; detailWidth?: string }) {
  return <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_var(--management-detail)] 2xl:grid-cols-[minmax(0,1.4fr)_var(--management-detail)]" style={{ "--management-detail": detailWidth } as CSSProperties}><div className={directoryVisible ? "block" : "hidden xl:block"}>{directory}</div><div className={detailVisible ? "block xl:sticky xl:top-20" : "hidden xl:block xl:sticky xl:top-20"}>{detail}</div></section>;
}
