export function SystemHealthCards({
 data,
}:{
 data: Record<string, unknown>;
}) {
 return (
  <div className="grid gap-3 sm:grid-cols-3">
   {Object.entries(data).map(([key,value])=>(
    <div
     key={key}
     className="
      rounded-xl border border-slate-200
      bg-white p-4
      dark:border-slate-700
      dark:bg-slate-900
     "
    >
     <div className="text-xs text-slate-500">
      {key}
     </div>
     <div className="mt-2 font-black">
      {String(value)}
     </div>
    </div>
   ))}
  </div>
 );
}
