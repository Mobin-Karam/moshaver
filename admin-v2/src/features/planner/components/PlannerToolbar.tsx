import { ReactNode } from "react";

export function PlannerToolbar({children}:{children:ReactNode}) {
  return (
    <section className="
      flex flex-wrap items-center justify-between gap-3
      rounded-2xl border border-[rgb(var(--border-subtle))]
      bg-[rgb(var(--surface-card))] p-4
    ">
      {children}
    </section>
  );
}
