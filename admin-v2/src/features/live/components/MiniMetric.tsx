export function MiniMetric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border p-2",
        warn
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200",
      ].join(" ")}
    >
      <strong className="block text-sm">
        {value}
      </strong>

      <small className="text-[10px] text-slate-500">
        {label}
      </small>
    </div>
  );
}
