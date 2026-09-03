import type { PlannerSummary } from "../api/planner-intelligence.api";

export function PlannerRangeAnalytics({
 summary,
}:{
 summary?: PlannerSummary;
}) {
 if(!summary) return null;

 return (
  <div className="
    grid gap-2 sm:grid-cols-4
  ">
   <Metric title="روز برنامه" value={summary.plans}/>
   <Metric title="فعالیت" value={summary.tasks}/>
   <Metric title="ساعت مطالعه" value={(summary.minutes/60).toFixed(1)}/>
   <Metric title="آزمون" value={summary.tests}/>
  </div>
 );
}

function Metric({
 title,
 value,
}:{
 title:string;
 value:string|number;
}) {
 return (
  <div className="
    rounded-xl border border-slate-200
    bg-white p-3
    dark:border-slate-700
    dark:bg-slate-900
  ">
   <div className="text-[11px] text-slate-500">
    {title}
   </div>
   <div className="mt-1 text-lg font-black">
    {value}
   </div>
  </div>
 );
}
