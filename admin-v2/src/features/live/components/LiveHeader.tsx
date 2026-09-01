import {
  RefreshCw,
} from "lucide-react";
import {
  Button,
} from "../../../shared/ui/ui";

export function LiveHeader({
  generatedAt,
  fetching,
  formatDateTime,
  onRefresh,
}: {
  generatedAt?: string;
  fetching: boolean;
  formatDateTime: (
    value?: string | Date,
  ) => string;
  onRefresh: () => void;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-bold text-brand">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>

        عملیات بلادرنگ
      </div>

      <div className="mr-auto flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500">
          {generatedAt
            ? `آخرین همگام‌سازی: ${formatDateTime(
                generatedAt,
              )}`
            : "در انتظار اولین همگام‌سازی"}
        </span>

        <Button
          variant="soft"
          loading={fetching}
          loadingLabel="در حال دریافت"
          onClick={onRefresh}
        >
          <RefreshCw size={16} />
          تازه‌سازی
        </Button>
      </div>
    </header>
  );
}
