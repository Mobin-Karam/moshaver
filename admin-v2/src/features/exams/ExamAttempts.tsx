import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, Eye, XCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../shared/api/api";
import { useLocale } from "../../shared/ui/locale";
import { Badge, Button, EmptyState } from "../../shared/ui/ui";
import type { AttemptDetail, AttemptSummary } from "./exam-model";

export function ExamAttempts({ studentId }: { studentId: string }) {
  const [attemptId, setAttemptId] = useState("");
  const history = useQuery({
    queryKey: ["exam-attempt-history", studentId],
    queryFn: () =>
      api.get<AttemptSummary[]>(`/admin/students/${studentId}/attempts`),
  });
  const detail = useQuery({
    queryKey: ["exam-attempt-detail", studentId, attemptId],
    enabled: !!attemptId,
    queryFn: () =>
      api.get<AttemptDetail>(
        `/admin/students/${studentId}/attempts/${attemptId}`,
      ),
  });
  if (attemptId)
    return (
      <AttemptReview
        detail={detail.data}
        loading={detail.isLoading}
        error={detail.isError}
        back={() => setAttemptId("")}
      />
    );
  if (history.isLoading)
    return (
      <div className="grid gap-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-20 animate-pulse rounded-md bg-slate-100"
          />
        ))}
      </div>
    );
  if (history.isError)
    return (
      <EmptyState
        title="دریافت سابقه تلاش‌ها ناموفق بود."
        action={
          <Button variant="soft" onClick={() => void history.refetch()}>
            تلاش دوباره
          </Button>
        }
      />
    );
  if (!history.data?.length)
    return <EmptyState title="این دانش‌آموز هنوز آزمونی را تحویل نداده است." />;
  return (
    <div className="grid max-h-[65vh] gap-2 overflow-auto">
      {history.data.map((attempt) => (
        <button
          key={attempt.id}
          className="grid gap-2 rounded-lg border p-3 text-right transition hover:border-brand hover:bg-indigo-50 sm:grid-cols-[1fr_auto]"
          onClick={() => setAttemptId(attempt.id)}
        >
          <span>
            <strong className="block">{attempt.title || "آزمون"}</strong>
            <small className="text-slate-500">
              {formatDate(attempt.submittedAt)} •{" "}
              {Math.round(Number(attempt.durationSeconds || 0) / 60)} دقیقه
            </small>
          </span>
          <span className="flex items-center gap-2">
            <Badge
              tone={
                attempt.percent >= 70
                  ? "green"
                  : attempt.percent >= 40
                    ? "amber"
                    : "red"
              }
            >
              {attempt.percent}٪
            </Badge>
            <small>
              {attempt.correct} درست • {attempt.wrong} غلط • {attempt.blank}{" "}
              نزده
            </small>
            <Eye size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}

function AttemptReview({
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
  const { formatDateTime } = useLocale();
  if (loading)
    return <div className="h-72 animate-pulse rounded-lg bg-slate-100" />;
  if (error || !detail)
    return (
      <EmptyState
        title="دریافت جزئیات تلاش ناموفق بود."
        action={
          <Button variant="soft" onClick={back}>
            بازگشت
          </Button>
        }
      />
    );
  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <Button className="h-9" variant="ghost" onClick={back}>
          <ArrowRight size={16} /> بازگشت
        </Button>
        <div className="min-w-0 flex-1">
          <strong>{detail.examTitle || detail.title || "جزئیات تلاش"}</strong>
          <p className="text-xs text-slate-500">
            {formatDateTime(detail.submittedAt)}
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
        <Metric label="درست" value={detail.correct} />
        <Metric label="غلط" value={detail.wrong} />
        <Metric label="نزده" value={detail.blank} />
        <Metric
          label="مدت"
          value={`${Math.round(Number(detail.durationSeconds || 0) / 60)} دقیقه`}
        />
      </div>
      <div className="grid max-h-[52vh] gap-3 overflow-auto">
        {detail.answers.map((answer, index) => (
          <article
            key={answer.answerId}
            className={`rounded-lg border p-3 ${answer.isCorrect ? "border-emerald-200" : "border-rose-200"}`}
          >
            <div className="flex items-start gap-2">
              {answer.isCorrect ? (
                <CheckCircle2 className="text-emerald-600" size={18} />
              ) : (
                <XCircle className="text-rose-600" size={18} />
              )}
              <strong className="min-w-0 flex-1">
                {index + 1}. {answer.question}
              </strong>
              {answer.topic ? <Badge tone="blue">{answer.topic}</Badge> : null}
            </div>
            <p className="mt-2 text-xs">
              پاسخ دانش‌آموز: {optionLabel(answer.selectedOption)} • پاسخ صحیح:{" "}
              {optionLabel(answer.correctOption)}
            </p>
            {answer.errorReason ? (
              <p className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-800">
                علت خطا: {answer.errorReason}
              </p>
            ) : null}
            {answer.explanation ? (
              <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                {answer.explanation}
              </p>
            ) : null}
            {answer.learningStatus ? (
              <span className="mt-2 flex items-center gap-1 text-xs text-indigo-700">
                <Clock3 size={13} /> وضعیت مرور: {answer.learningStatus}
              </span>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <small className="block text-slate-500">{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
function optionLabel(value?: string) {
  return value
    ? `گزینه ${({ a: "۱", b: "۲", c: "۳", d: "۴" } as Record<string, string>)[value] || value}`
    : "بدون پاسخ";
}
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        dateStyle: "medium",
      }).format(new Date(value))
    : "—";
}
