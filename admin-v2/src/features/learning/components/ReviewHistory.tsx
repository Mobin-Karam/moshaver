import { useQuery } from "@tanstack/react-query";
import { getLearningReviewHistory } from "../api/learning.api";
import {
  Badge,
  EmptyState,
} from "../../../shared/ui/ui";
import { LearningSkeleton } from "./LearningSkeleton";

export function ReviewHistory({
  studentId,
  itemId,
  formatDateTime,
}: {
  studentId: string;
  itemId: string;
  formatDateTime: (
    value?: string | Date,
  ) => string;
}) {
  const history = useQuery({
    queryKey: [
      "learning-history",
      studentId,
      itemId,
    ],
    queryFn: () =>
      getLearningReviewHistory(
        studentId,
        itemId,
      ),
  });

  if (history.isLoading) {
    return (
      <LearningSkeleton />
    );
  }

  if (history.isError) {
    return (
      <EmptyState title="تاریخچه مرور دریافت نشد." />
    );
  }

  return history.data?.length ? (
    <div className="grid gap-2">
      {history.data.map(
        (row) => (
          <article
            key={row.id}
            className="rounded-md border p-3"
          >
            <div className="flex justify-between gap-2">
              <strong>
                تسلط{" "}
                {row.previousMastery.toLocaleString(
                  "fa-IR",
                )}{" "}
                ←{" "}
                {row.newMastery.toLocaleString(
                  "fa-IR",
                )}
              </strong>

              <Badge tone="blue">
                امتیاز{" "}
                {row.rating.toLocaleString(
                  "fa-IR",
                )}
              </Badge>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {formatDateTime(
                row.reviewedAt,
              )}{" "}
              · فاصله بعدی{" "}
              {row.nextIntervalDays.toLocaleString(
                "fa-IR",
              )}{" "}
              روز
            </p>
          </article>
        ),
      )}
    </div>
  ) : (
    <EmptyState title="هنوز مروری برای این مورد ثبت نشده است." />
  );
}
