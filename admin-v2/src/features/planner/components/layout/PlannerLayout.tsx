import type { ReactNode } from "react";

export function PlannerLayout({children}:{children:ReactNode}) {
  return (
    <main className="grid gap-3">
      {children}
    </main>
  );
}
