import type { ReactNode } from "react";
import { PlannerToolbar } from "./PlannerToolbar";

export function PlannerHeader({children}:{children:ReactNode}) {
  return <PlannerToolbar>{children}</PlannerToolbar>;
}
