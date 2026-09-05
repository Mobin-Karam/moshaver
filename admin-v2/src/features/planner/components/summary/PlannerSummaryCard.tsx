export function PlannerSummaryCard({
  children,
}:{
  children: React.ReactNode;
}) {
  return (
    <section className="
      rounded-xl border border-slate-200
      bg-white px-3 py-2
      dark:border-slate-700 dark:bg-slate-900
    ">
      {children}
    </section>
  );
}
