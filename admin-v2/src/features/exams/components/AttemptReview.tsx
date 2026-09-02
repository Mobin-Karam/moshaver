import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
} from "../../../shared/ui/ui";
import { useLocale } from "../../../shared/ui/locale";
import {
  optionLabel,
} from "../lib/exam-formatters";
import type { AttemptDetail } from "../model/exam-model";
import { Metric } from "./Metric";

export function AttemptReview({
  detail,
  loading,
  error,
  back,
}: {
  detail?: AttemptDetail;
  loading: boolean;
  error: boolean;
  back: () => void;
}) {
  const {
    formatDateTime,
  } = useLocale();

  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
    );
  }

  if (
    error ||
    !detail
  ) {
    return (
      <EmptyState
        title="دریافت جزئیات تلاش ناموفق بود."
        action={
          <Button
            variant="soft"
            onClick={back}
          >
            بازگشت
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <Button
          className="h-9"
          variant="ghost"
          onClick={back}
        >
          <ArrowRight size={16} />
          بازگشت
        </Button>

        <div className="min-w-0 flex-1">
          <strong>
            {detail.examTitle ||
              detail.title ||
              "جزئیات تلاش"}
          </strong>

          <p className="text-xs text-slate-500">
            {formatDateTime(
              detail.submittedAt,
            )}
          </p>
        </div>

        <Badge
          tone={
            detail.percent >= 70
              ? "green"
              : detail.percent >= 40
                ? "amber"
                : "red"
          }
        >
          {detail.percent}٪
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <Metric
          label="درست"
          value={detail.correct}
        />

        <Metric
          label="غلط"
          value={detail.wrong}
        />

        <Metric
          label="نزده"
          value={detail.blank}
        />

        <Metric
          label="مدت"
          value={`${Math.round(
            Number(
              detail.durationSeconds ||
                0,
            ) / 60,
          )} دقیقه`}
        />
      </div>

      <div className="grid max-h-[52vh] gap-3 overflow-auto">
        {detail.answers.map(
          (answer, index) => (
            <article
              key={answer.answerId}
              className={[
                "rounded-lg border p-3",
                answer.isCorrect
                  ? "border-emerald-200"
                  : "border-rose-200",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                {answer.isCorrect ? (
                  <CheckCircle2
                    className="text-emerald-600"
                    size={18}
                  />
                ) : (
                  <XCircle
                    className="text-rose-600"
                    size={18}
                  />
                )}

                <strong className="min-w-0 flex-1">
                  {index + 1}.{" "}
                  {answer.question}
                </strong>

                {answer.topic ? (
                  <Badge tone="blue">
                    {answer.topic}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-2 text-xs">
                پاسخ دانش‌آموز:{" "}
                {optionLabel(
                  answer.selectedOption,
                )}{" "}
                • پاسخ صحیح:{" "}
                {optionLabel(
                  answer.correctOption,
                )}
              </p>

              {answer.errorReason ? (
                <p className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-800">
                  علت خطا:{" "}
                  {answer.errorReason}
                </p>
              ) : null}

              {answer.explanation ? (
                <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                  {answer.explanation}
                </p>
              ) : null}

              {answer.learningStatus ? (
                <span className="mt-2 flex items-center gap-1 text-xs text-indigo-700">
                  <Clock3 size={13} />
                  وضعیت مرور:{" "}
                  {
                    answer.learningStatus
                  }
                </span>
              ) : null}
            </article>
          ),
        )}
      </div>
    </div>
  );
}
