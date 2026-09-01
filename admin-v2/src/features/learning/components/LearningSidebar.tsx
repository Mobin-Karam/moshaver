import { Card } from "../../../shared/ui/ui";
import type { LearningSummary } from "../model/learning-model";

export function LearningSidebar({
  summary,
}: {
  summary?: LearningSummary;
}) {
  return (
    <aside className="grid content-start gap-4 xl:sticky xl:top-20">
      <Card>
        <h3 className="mb-3 font-bold">
          وضعیت درس‌ها
        </h3>

        {summary?.subjects
          ?.length ? (
          <div className="grid gap-3">
            {summary.subjects.map(
              (row) => (
                <div
                  key={row.subject}
                >
                  <div className="mb-1 flex justify-between text-xs">
                    <strong>
                      {row.subject}
                    </strong>

                    <span>
                      {row.due.toLocaleString(
                        "fa-IR",
                      )}{" "}
                      سررسید
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-indigo-600"
                      style={{
                        width: `${Math.min(
                          100,
                          row.mastery *
                            20,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            هنوز داده‌ای ثبت نشده است.
          </p>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 font-bold">
          الگوهای خطا
        </h3>

        {summary
          ?.mistakePatterns
          ?.length ? (
          <div className="grid gap-2">
            {summary.mistakePatterns
              .slice(0, 8)
              .map(
                (
                  row,
                  index,
                ) => (
                  <div
                    key={`${row.subject}-${row.reason}-${index}`}
                    className="rounded-md bg-rose-50 p-2 text-xs text-rose-800"
                  >
                    <strong>
                      {row.subject ||
                        "بدون درس"}
                    </strong>

                    <p className="mt-1">
                      {row.reason} ·{" "}
                      {row.count.toLocaleString(
                        "fa-IR",
                      )}{" "}
                      بار
                    </p>
                  </div>
                ),
              )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            الگوی خطایی برای نمایش وجود ندارد.
          </p>
        )}
      </Card>
    </aside>
  );
}
