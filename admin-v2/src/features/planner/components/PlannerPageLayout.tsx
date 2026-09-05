import type { ReactNode } from "react";
import { PlannerHeader } from "./PlannerHeader";
import { PlannerOverview } from "./PlannerOverview";
import { PlannerContent } from "./PlannerContent";

export function PlannerPageLayout({
 header,
 overview,
 content,
}:{
 header:ReactNode;
 overview:ReactNode;
 content:ReactNode;
}) {
 return (
  <div className="grid gap-3">
   <PlannerHeader>{header}</PlannerHeader>
   <PlannerOverview>{overview}</PlannerOverview>
   <PlannerContent {...content as any}/>
  </div>
 );
}
