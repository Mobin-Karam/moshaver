export function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <span className="block text-slate-500">
        {label}
      </span>

      <strong className="block truncate">
        {value}
      </strong>
    </div>
  );
}
