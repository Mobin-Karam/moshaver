import {
  AlertTriangle,
  Clock3,
  MessageSquareText,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../../shared/ui/ui";
import { cn, fa } from "../../../shared/lib/utils";
import type { FollowUpMetric } from "../model/dashboard.types";

const icons: Record<FollowUpMetric["key"], LucideIcon> = {
  recoveries: RotateCcw,
  missed: Clock3,
  chat: MessageSquareText,
  attention: AlertTriangle,
};

const toneClass: Record<FollowUpMetric["tone"], string> = {
  red: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/50",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/50",
  blue: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/50",
  neutral: "bg-slate-50 text-slate-600 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export function DashboardFollowUpCard({ items }: { items: FollowUpMetric[] }) {
  return (
    <Card className="p-0 dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h3 className="font-bold text-slate-900 dark:text-white">صف پیگیری امروز</h3>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          موارد عملیاتی که نیاز به بررسی یا پاسخ دارند.
        </p>
      </header>

      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
        {items.map((item) => {
          const Icon = icons[item.key];
          const content = (
            <>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl ring-1", toneClass[item.tone])}>
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm text-slate-800 dark:text-slate-100">
                    {item.label}
                  </strong>
                  <b className="text-lg tabular-nums text-slate-900 dark:text-white">{fa(item.value)}</b>
                </span>
                <small className="mt-0.5 block text-[10px] leading-5 text-slate-400 dark:text-slate-500">
                  {item.description}
                </small>
              </span>
            </>
          );

          if (item.href.startsWith("#")) {
            return (
              <a
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-brand/25 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.href}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-brand/25 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
