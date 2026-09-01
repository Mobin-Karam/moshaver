export function ConversationSkeleton() {
  return (
    <div className="grid gap-px">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex gap-3 p-3">
          <span className="size-10 animate-pulse rounded-full bg-slate-100" />
          <span className="grid flex-1 gap-2">
            <i className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <i className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
          </span>
        </div>
      ))}
    </div>
  );
}
