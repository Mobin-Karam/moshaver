import type { ReactNode } from "react";

export function PlannerOverview({children}:{children:ReactNode}) {
  return (
    <section className="rounded-2xl border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-card))] px-3 py-2">
      {children}
    </section>
  );
}
