import {
  CalendarClock,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Exam } from "../../../shared/types/domain";
import { useLocale } from "../../../shared/ui/locale";
import {
  Badge,
  Button,
} from "../../../shared/ui/ui";
import {
  examReadiness,
} from "../model/exam-model";
import {
  statusLabel,
} from "../lib/exam-formatters";
import { Metric } from "./Metric";

export function ExamCard({
  exam,
  checked,
  onCheck,
  onEdit,
  onDelete,
  onToggle,
  toggleBusy,
  onAddSyllabus,
  onDeleteSyllabus,
  studentId,
}: {
  exam: Exam;
  checked: boolean;
  onCheck: (
    value: boolean,
  ) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggleBusy: boolean;
  onAddSyllabus: () => void;
  onDeleteSyllabus: (
    id: string,
  ) => void;
  studentId: string;
}) {
  const {
    formatDate,
    formatDateTime,
  } = useLocale();

  const readiness =
    examReadiness(exam);

  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onCheck(
              event.target.checked,
            )
          }
        />

        <div className="min-w-0 flex-1">
          <strong className="block truncate">
            {exam.title}
          </strong>

          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock
              size={14}
            />

            {exam.persianDate ||
              formatDate(
                exam.isoDate,
              )}
          </span>
        </div>

        <Badge
          tone={readiness.tone}
        >
          {readiness.label}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Metric
          label="وضعیت"
          value={statusLabel(
            exam.status,
          )}
        />

        <Metric
          label="دقیقه"
          value={
            exam.durationMinutes ||
            120
          }
        />

        <Metric
          label="سؤال"
          value={
            exam.delivery
              ?.questionCount || 0
          }
        />

        <Metric
          label="تلاش"
          value={
            exam.maxAttempts || 1
          }
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {formatDateTime(
          exam.openAt,
        )}{" "}
        →{" "}
        {formatDateTime(
          exam.closeAt,
        )}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="h-8 px-2 text-xs"
          variant="soft"
          onClick={onEdit}
        >
          <Pencil size={14} />
          ویرایش
        </Button>

        <Link
          to={`/admin/questions?examId=${encodeURIComponent(
            exam.id,
          )}&studentId=${encodeURIComponent(
            studentId,
          )}`}
        >
          <Button
            className="h-8 px-2 text-xs"
            variant="soft"
          >
            سؤال‌ها
          </Button>
        </Link>

        <Button
          className="h-8 px-2 text-xs"
          variant="ghost"
          loading={toggleBusy}
          onClick={onToggle}
        >
          {exam.published
            ? "پیش‌نویس"
            : "انتشار"}
        </Button>

        <Button
          className="h-8 px-2"
          variant="danger"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {exam.published &&
      !exam.delivery
        ?.questionCount ? (
        <p className="mt-3 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
          این آزمون منتشر شده اما هیچ
          سؤالی ندارد؛ برای دانش‌آموز
          آماده نیست.
        </p>
      ) : null}

      <details className="mt-3 border-t pt-3">
        <summary className="flex cursor-pointer list-none justify-between">
          <strong className="text-xs">
            بودجه‌بندی (
            {exam.syllabus?.length ||
              0}
            )
          </strong>

          <button
            type="button"
            className="text-xs text-brand"
            onClick={(event) => {
              event.preventDefault();
              onAddSyllabus();
            }}
          >
            + افزودن
          </button>
        </summary>

        <div className="mt-2">
          {exam.syllabus?.map(
            (item) => (
              <div
                key={item.id}
                className="mb-1 flex justify-between rounded bg-slate-50 p-2 text-xs"
              >
                <span>
                  <strong>
                    {item.subject}
                  </strong>
                  :{" "}
                  {
                    item.description
                  }
                  {item.track
                    ? ` • ${item.track}`
                    : ""}
                </span>

                <button
                  className="text-rose-700"
                  onClick={() =>
                    onDeleteSyllabus(
                      item.id,
                    )
                  }
                >
                  حذف
                </button>
              </div>
            ),
          )}

          {!exam.syllabus
            ?.length ? (
            <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">
              بودجه‌بندی ثبت نشده است.
            </p>
          ) : null}
        </div>
      </details>
    </article>
  );
}
