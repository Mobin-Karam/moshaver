export function NotificationSkeletons() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}
