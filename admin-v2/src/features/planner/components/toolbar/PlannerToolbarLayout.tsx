import type { ReactNode } from "react";

export function PlannerToolbarLayout({children}:{children:ReactNode}) {
  return (
    <header className="
      sticky top-0 z-20 rounded-xl
      border border-slate-200
      bg-white/95 p-3 shadow-sm backdrop-blur
      dark:border-slate-700 dark:bg-slate-900/95
    ">
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </header>
  );
}
