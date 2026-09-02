import {
  Edit3,
  History,
  Trash2,
} from "lucide-react";
import {
  todayIso,
} from "../../../shared/lib/utils";
import {
  Badge,
  Button,
} from "../../../shared/ui/ui";
import {
  isLearningDue,
  learningStatusLabel,
  type LearningItem,
} from "../model/learning-model";

export function LearningRow({
  item,
  formatDate,
  onEdit,
  onHistory,
  onDelete,
}: {
  item: LearningItem;
  formatDate: (
    value?: string | Date,
  ) => string;
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const due =
    isLearningDue(
      item,
      todayIso(),
    );

  return (
    <article
      className={[
        "rounded-lg border p-3",
        due
          ? "border-rose-200 bg-rose-50/40"
          : "bg-white",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate">
              {item.title}
            </strong>

            <Badge
              tone={
                due
                  ? "red"
                  : item.status ===
                      "archived"
                    ? "neutral"
                    : item.status ===
                        "done"
                      ? "green"
                      : "amber"
              }
            >
              {due
                ? "سررسیدشده"
                : learningStatusLabel(
                    item.status,
                  )}
            </Badge>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {[
              item.subject,
              item.book,
              item.chapter,
              item.lesson,
              item.topic,
            ]
              .filter(Boolean)
              .join(" · ") ||
              "بدون دسته‌بندی"}
          </p>
        </div>

        <div className="flex gap-1">
          <Button
            className="size-9 p-0"
            variant="ghost"
            aria-label="تاریخچه مرور"
            onClick={onHistory}
          >
            <History size={15} />
          </Button>

          <Button
            className="size-9 p-0"
            variant="ghost"
            aria-label="ویرایش"
            onClick={onEdit}
          >
            <Edit3 size={15} />
          </Button>

          <Button
            className="size-9 p-0 text-rose-700"
            variant="ghost"
            aria-label="حذف"
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-1">
          مرور بعدی:{" "}
          {formatDate(
            item.dueDate,
          )}
        </span>

        <span className="rounded bg-slate-100 px-2 py-1">
          تسلط{" "}
          {item.mastery.toLocaleString(
            "fa-IR",
          )}
          /۵
        </span>

        <span className="rounded bg-slate-100 px-2 py-1">
          {item.reviewCount.toLocaleString(
            "fa-IR",
          )}{" "}
          مرور
        </span>

        <span className="rounded bg-slate-100 px-2 py-1">
          فاصله{" "}
          {item.intervalDays.toLocaleString(
            "fa-IR",
          )}{" "}
          روز
        </span>

        {item.sourceAnswerId ? (
          <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">
            متصل به پاسخ آزمون
          </span>
        ) : null}
      </div>

      {item.note ||
      item.hint ? (
        <details className="mt-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold">
            یادداشت و راهنمای مرور
          </summary>

          {item.note ? (
            <p className="mt-2">
              {item.note}
            </p>
          ) : null}

          {item.hint ? (
            <p className="mt-1 text-indigo-800">
              راهنما: {item.hint}
            </p>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}
