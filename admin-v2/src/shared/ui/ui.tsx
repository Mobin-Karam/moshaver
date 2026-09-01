import { LoaderCircle } from "lucide-react";
import { ComponentProps, ReactNode, forwardRef } from "react";
import { cn } from "../lib/utils";

export function Button({
  className,
  variant = "primary",
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "soft" | "danger" | "ghost";
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-teal-800",
        variant === "soft" &&
          "bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50",
        variant === "danger" && "bg-rosewood text-white hover:bg-rose-800",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  function Input(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100",
          props.className,
        )}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100",
        props.className,
      )}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  function Select(props, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={cn(
          "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100",
          props.className,
        )}
      />
    );
  },
);

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "red" && "bg-rose-50 text-rose-700",
        tone === "blue" && "bg-sky-50 text-sky-700",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-slate-500">
      {title}
      {action}
    </div>
  );
}

export function LoadingState({
  label = "در حال دریافت...",
}: {
  label?: string;
}) {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
      {label}
    </div>
  );
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-rosewood">{error}</span> : null}
    </label>
  );
}
