export function GlobalCommandPalette(){
  return (
    <div className="
      rounded-xl border border-slate-200
      bg-white p-4
      dark:border-slate-700
      dark:bg-slate-900
    ">
      <input
        className="w-full bg-transparent outline-none"
        placeholder="Search students, plans, reports..."
      />
    </div>
  );
}
