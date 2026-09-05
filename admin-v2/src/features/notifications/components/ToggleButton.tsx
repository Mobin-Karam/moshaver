import type { ReactNode } from "react";

export function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${label}: ${active ? "فعال" : "غیرفعال"}`}
      onClick={onClick}
      className={[
        "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {icon}
      {label}
      <span
        aria-hidden="true"
        className={[
          "size-2 rounded-full",
          active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600",
        ].join(" ")}
      />
    </button>
  );
}
