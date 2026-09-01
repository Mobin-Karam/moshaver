import type { Exam } from "../../../shared/types/domain";
import {
  Badge,
  Button,
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import { ExamCard } from "./ExamCard";

export function ExamList({
  exams,
  filtered,
  selected,
  studentId,
  loading,
  error,
  toggleBusyId,
  onRetry,
  onSelectAll,
  onCheck,
  onEdit,
  onDelete,
  onToggle,
  onAddSyllabus,
  onDeleteSyllabus,
}: {
  exams: Exam[];
  filtered: Exam[];
  selected: string[];
  studentId: string;
  loading: boolean;
  error: boolean;
  toggleBusyId?: string;
  onRetry: () => void;
  onSelectAll: (
    checked: boolean,
  ) => void;
  onCheck: (
    examId: string,
    checked: boolean,
  ) => void;
  onEdit: (
    exam: Exam,
  ) => void;
  onDelete: (
    exam: Exam,
  ) => void;
  onToggle: (
    exam: Exam,
  ) => void;
  onAddSyllabus: (
    exam: Exam,
  ) => void;
  onDeleteSyllabus: (
    id: string,
  ) => void;
}) {
  void exams;

  const allSelected =
    !!filtered.length &&
    filtered.every((exam) =>
      selected.includes(exam.id),
    );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) =>
              onSelectAll(
                event.target.checked,
              )
            }
          />{" "}
          انتخاب همه نتایج
        </label>

        <Badge tone="blue">
          {filtered.length} آزمون
        </Badge>
      </div>

      {loading ? (
        <div
          className="grid gap-3 lg:grid-cols-2"
          aria-label="در حال دریافت آزمون‌ها"
        >
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-lg bg-slate-100"
              />
            ),
          )}
        </div>
      ) : error ? (
        <EmptyState
          title="دریافت آزمون‌ها ناموفق بود؛ اتصال را بررسی و دوباره تلاش کنید."
          action={
            <Button
              variant="soft"
              onClick={onRetry}
            >
              تلاش دوباره
            </Button>
          }
        />
      ) : filtered.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map(
            (exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                checked={selected.includes(
                  exam.id,
                )}
                onCheck={(
                  checked,
                ) =>
                  onCheck(
                    exam.id,
                    checked,
                  )
                }
                onEdit={() =>
                  onEdit(exam)
                }
                onDelete={() =>
                  onDelete(exam)
                }
                onToggle={() =>
                  onToggle(exam)
                }
                toggleBusy={
                  toggleBusyId ===
                  exam.id
                }
                onAddSyllabus={() =>
                  onAddSyllabus(
                    exam,
                  )
                }
                onDeleteSyllabus={
                  onDeleteSyllabus
                }
                studentId={
                  studentId
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyState title="آزمونی با این فیلتر پیدا نشد." />
      )}
    </Card>
  );
}
