import type { ReviewQueueItem } from "../api/reviews.api";

export function ReviewQueue({
  items,
}: {
  items: ReviewQueueItem[];
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="
            rounded-xl border border-slate-200
            bg-white p-3
            dark:border-slate-700 dark:bg-slate-900
          "
        >
          <div className="font-bold text-sm">
            {item.title}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            موعد مرور: {item.dueAt}
          </div>

          {item.priority && (
            <div className="mt-2 text-xs font-bold">
              اولویت: {item.priority}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
