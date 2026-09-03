import { CheckSquare, X } from "lucide-react";

export function PlannerBatchToolbar({
  count,
  onClear,
  onAction,
}:{
  count:number;
  onClear:()=>void;
  onAction:(action:string)=>void;
}) {
  if(!count) return null;

  return (
    <div className="
      flex flex-wrap items-center gap-2
      rounded-xl border border-brand/20
      bg-brand/5 p-3
      dark:bg-brand/10
    ">
      <CheckSquare size={16}/>

      <strong className="text-sm">
        {count} فعالیت انتخاب شده
      </strong>

      <button
        onClick={()=>onAction("shift")}
        className="rounded-lg bg-white px-3 py-1 text-xs font-bold dark:bg-slate-800"
      >
        جابه‌جایی زمان
      </button>

      <button
        onClick={()=>onAction("publish")}
        className="rounded-lg bg-white px-3 py-1 text-xs font-bold dark:bg-slate-800"
      >
        تغییر انتشار
      </button>

      <button
        onClick={onClear}
        className="ml-auto grid size-7 place-items-center rounded-lg"
        aria-label="پاک کردن انتخاب"
      >
        <X size={15}/>
      </button>
    </div>
  );
}
