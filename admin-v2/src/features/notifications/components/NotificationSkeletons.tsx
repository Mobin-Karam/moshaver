export function NotificationSkeletons() {
  return (
    <div className="grid gap-2">
      {[1, 2, 3].map(
        (item) => (
          <div
            key={item}
            className="h-20 animate-pulse rounded-lg bg-slate-100"
          />
        ),
      )}
    </div>
  );
}
