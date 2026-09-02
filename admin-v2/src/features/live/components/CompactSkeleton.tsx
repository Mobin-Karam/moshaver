export function CompactSkeleton() {
  return (
    <div className="grid gap-px">
      {[1, 2, 3, 4, 5, 6].map(
        (item) => (
          <div
            key={item}
            className="h-[68px] animate-pulse bg-slate-50"
          />
        ),
      )}
    </div>
  );
}
