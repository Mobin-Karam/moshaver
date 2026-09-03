export function FollowUpCenter({
 items = [],
}: {
 items?: Array<{
  id:string;
  title?:string;
  description?:string;
 }>;
}) {
 return (
  <div className="space-y-3">
   {items.map((item)=>(
    <div
     key={item.id}
     className="
      rounded-xl border border-slate-200
      bg-white p-4
      dark:border-slate-700
      dark:bg-slate-900
     "
    >
     <div className="font-bold">
      {item.title ?? "پیگیری"}
     </div>

     <p className="mt-2 text-sm text-slate-500">
      {item.description}
     </p>

     <div className="mt-3 flex gap-2">
      <button className="rounded-lg bg-brand px-3 py-1 text-xs text-white">
       Resolve
      </button>

      <button className="rounded-lg border px-3 py-1 text-xs">
       Dismiss
      </button>
     </div>
    </div>
   ))}
  </div>
 );
}
