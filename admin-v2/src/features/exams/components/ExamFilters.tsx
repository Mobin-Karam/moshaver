import {
  RotateCcw,
} from "lucide-react";
import type { Exam } from "../../../shared/types/domain";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
} from "../../../shared/ui/ui";
import type {
  ExamFilterStatus,
  ExamVisibilityFilter,
} from "../model/exam.types";

export function ExamFilters({
  exams,
  pendingRetryCount,
  search,
  status,
  visibility,
  selectedCount,
  onSearchChange,
  onStatusChange,
  onVisibilityChange,
  onClear,
  onBulk,
}: {
  exams: Exam[];
  pendingRetryCount: number;
  search: string;
  status: ExamFilterStatus;
  visibility: ExamVisibilityFilter;
  selectedCount: number;
  onSearchChange: (
    value: string,
  ) => void;
  onStatusChange: (
    value: ExamFilterStatus,
  ) => void;
  onVisibilityChange: (
    value: ExamVisibilityFilter,
  ) => void;
  onClear: () => void;
  onBulk: (
    action:
      | "publish"
      | "draft"
      | "delete",
  ) => void;
}) {
  const hasFilters =
    search ||
    status !== "all" ||
    visibility !== "all";

  return (
    <Card className="sticky top-16 z-10 shadow-sm">
      <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
        <Input
          type="search"
          placeholder="جست‌وجوی نام یا تاریخ…"
          value={search}
          onChange={(event) =>
            onSearchChange(
              event.target.value,
            )
          }
        />

        <Select
          value={status}
          onChange={(event) =>
            onStatusChange(
              event.target
                .value as ExamFilterStatus,
            )
          }
        >
          <option value="all">
            همه وضعیت‌ها
          </option>

          <option value="upcoming">
            آینده
          </option>

          <option value="active">
            فعال
          </option>

          <option value="completed">
            تمام‌شده
          </option>

          <option value="cancelled">
            لغوشده
          </option>
        </Select>

        <Select
          value={visibility}
          onChange={(event) =>
            onVisibilityChange(
              event.target
                .value as ExamVisibilityFilter,
            )
          }
        >
          <option value="all">
            منتشر و پیش‌نویس
          </option>

          <option value="published">
            منتشر
          </option>

          <option value="draft">
            پیش‌نویس
          </option>
        </Select>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="blue">
          {exams.length} کل
        </Badge>

        <Badge tone="green">
          {
            exams.filter(
              (exam) =>
                exam.published,
            ).length
          }{" "}
          منتشر
        </Badge>

        <Badge tone="red">
          {
            exams.filter(
              (exam) =>
                exam.published &&
                !exam.delivery
                  ?.questionCount,
            ).length
          }{" "}
          بدون سؤال
        </Badge>

        {pendingRetryCount ? (
          <Badge tone="amber">
            {pendingRetryCount} درخواست
          </Badge>
        ) : null}

        {hasFilters ? (
          <Button
            className="h-7 px-2 text-xs"
            variant="ghost"
            onClick={onClear}
          >
            <RotateCcw size={13} />
            پاک‌کردن فیلترها
          </Button>
        ) : null}
      </div>

      {selectedCount ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2 text-sm">
          <strong>
            {selectedCount} انتخاب
          </strong>

          <Button
            className="h-8"
            variant="soft"
            onClick={() =>
              onBulk("publish")
            }
          >
            انتشار
          </Button>

          <Button
            className="h-8"
            variant="soft"
            onClick={() =>
              onBulk("draft")
            }
          >
            پیش‌نویس
          </Button>

          <Button
            className="h-8"
            variant="danger"
            onClick={() =>
              onBulk("delete")
            }
          >
            حذف
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
