import {
  Eye,
} from "lucide-react";
import type {
  UseQueryResult,
} from "@tanstack/react-query";
import {
  Badge,
  Button,
  EmptyState,
} from "../../../shared/ui/ui";
import { formatAttemptDate } from "../lib/exam-formatters";
import type { AttemptSummary } from "../model/exam-model";

export function AttemptHistoryList({
  history,
  onSelect,
}: {
  history: UseQueryResult<
    AttemptSummary[],
    Error
  >;
  onSelect: (
    attemptId: string,
  ) => void;
}) {
  if (history.isLoading) {
    return (
      <div className="grid gap-2">
        {[1, 2, 3].map(
          (item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-md bg-slate-100"
            />
          ),
        )}
      </div>
    );
  }

  if (history.isError) {
    return (
      <EmptyState
        title="دریافت سابقه تلاش‌ها ناموفق بود."
        action={
          <Button
            variant="soft"
            onClick={() =>
              void history.refetch()
            }
          >
            تلاش دوباره
          </Button>
        }
      />
    );
  }

  if (!history.data?.length) {
    return (
      <EmptyState title="این دانش‌آموز هنوز آزمونی را تحویل نداده است." />
    );
  }

  return (
    <div className="grid max-h-[65vh] gap-2 overflow-auto">
      {history.data.map(
        (attempt) => (
          <button
            key={attempt.id}
            className="grid gap-2 rounded-lg border p-3 text-right transition hover:border-brand hover:bg-teal-50 sm:grid-cols-[1fr_auto]"
            onClick={() =>
              onSelect(
                attempt.id,
              )
            }
          >
            <span>
              <strong className="block">
                {attempt.title ||
                  "آزمون"}
              </strong>

              <small className="text-slate-500">
                {formatAttemptDate(
                  attempt.submittedAt,
                )}{" "}
                •{" "}
                {Math.round(
                  Number(
                    attempt.durationSeconds ||
                      0,
                  ) / 60,
                )}{" "}
                دقیقه
              </small>
            </span>

            <span className="flex items-center gap-2">
              <Badge
                tone={
                  attempt.percent >= 70
                    ? "green"
                    : attempt.percent >=
                        40
                      ? "amber"
                      : "red"
                }
              >
                {attempt.percent}٪
              </Badge>

              <small>
                {attempt.correct} درست •{" "}
                {attempt.wrong} غلط •{" "}
                {attempt.blank} نزده
              </small>

              <Eye size={16} />
            </span>
          </button>
        ),
      )}
    </div>
  );
}
