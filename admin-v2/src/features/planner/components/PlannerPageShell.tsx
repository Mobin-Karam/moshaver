import type { ReactNode } from "react";

export function PlannerPageShell({children}:{children:ReactNode}) {
  return (
    <main className="grid gap-4">
      {children}
    </main>
  );
}
