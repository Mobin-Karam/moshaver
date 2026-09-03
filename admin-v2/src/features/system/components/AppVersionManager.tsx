export function AppVersionManager({
 versions,
}:{
 versions:Array<{
  app:string;
  version:string;
 }>;
}) {
 return (
  <div className="space-y-2">
   {versions.map((item)=>(
    <div
     key={item.app}
     className="
      flex items-center justify-between
      rounded-xl border border-slate-200
      bg-white p-3
      dark:border-slate-700
      dark:bg-slate-900
     "
    >
     <span className="font-bold">
      {item.app}
     </span>

     <span className="font-mono text-sm">
      {item.version}
     </span>
    </div>
   ))}
  </div>
 );
}
