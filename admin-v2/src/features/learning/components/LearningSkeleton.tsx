export function LearningSkeleton() {
  return (
    <div className="grid gap-2">
      {[1, 2, 3, 4].map(
        (row) => (
          <div
            key={row}
            className="h-24 animate-pulse rounded-lg bg-slate-100"
          />
        ),
      )}
    </div>
  );
}
