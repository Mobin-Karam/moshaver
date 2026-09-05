export function ReportMetrics({
  data,
}: {
  data?: Record<string, number | undefined>;
}) {
  if (!data) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(data).map(([k, v]) => (
        <div
          key={k}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-white"
        >
          <div className="text-xs text-slate-500">{k}</div>
          <div className="mt-2 text-2xl font-black text-ink">{v ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
