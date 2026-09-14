import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, CircleHelp, FilePlus2, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ManagementPageHeader, ManagementStat } from "../../../shared/ui/management-workspace";
import { Button, Card, EmptyState, LoadingState } from "../../../shared/ui/ui";
import { useAuth } from "../../auth";
import { getExams, getRetryRequests } from "../../exams/api/exams.api";
import { educationMetrics, subjectDistribution } from "../model/education-overview";

const actions = [
  { to: "/admin/exams", label: "ساخت آزمون", capability: "exams.create", icon: FilePlus2 },
  { to: "/admin/questions", label: "ساخت سؤال", capability: "questions.create", icon: CircleHelp },
  { to: "/admin/questions", label: "ورود سؤال", capability: "import.preview", icon: ArrowLeft },
  { to: "/admin/quizzes", label: "ساخت آزمونک", capability: "quizzes.create", icon: Sparkles },
  {
    to: "/admin/exams",
    label: "درخواست های بازیابی",
    capability: "retry_requests.read",
    icon: RotateCcw,
  },
] as const;

export function EducationOverviewPage() {
  const auth = useAuth();
  const exams = useQuery({ queryKey: ["exams"], queryFn: getExams });
  const canReadRetries = auth.can("retry_requests.read");
  const retries = useQuery({
    queryKey: ["exam-retry"],
    queryFn: getRetryRequests,
    enabled: canReadRetries,
  });
  const metrics = educationMetrics(exams.data || [], retries.data || []);
  const subjects = subjectDistribution(exams.data || []);
  const visibleActions = actions.filter((action) => auth.can(action.capability));

  return (
    <div className="grid gap-5">
      <ManagementPageHeader
        eyebrow="مرکز آموزش"
        title="عملیات آموزشی"
        description="نمای زنده و محدود به سازمان فعال از آزمون ها، تلاش ها، محتوا و درخواست های بازیابی."
        action={
          <Link to="/admin/exams">
            <Button>
              <BookOpenCheck size={16} />
              آزمون ها
            </Button>
          </Link>
        }
      />

      {exams.isLoading ? (
        <LoadingState label="در حال دریافت نمای آموزش…" />
      ) : exams.isError ? (
        <EmptyState
          title="دریافت نمای آموزش ناموفق بود."
          action={
            <Button variant="soft" onClick={() => void exams.refetch()}>
              تلاش دوباره
            </Button>
          }
        />
      ) : (
        <>
          <section className="flex flex-wrap gap-2" aria-label="شاخص های آموزشی">
            {metrics.map((metric) => (
              <ManagementStat
                key={metric.key}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </section>

          {visibleActions.length ? (
            <Card className="p-4">
              <h2 className="font-black text-ink">اقدام سریع</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleActions.map((action) => (
                  <Link key={`${action.to}-${action.label}`} to={action.to}>
                    <Button variant="soft">
                      <action.icon size={16} />
                      {action.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="font-black text-ink">توزیع درس ها</h2>
              {subjects.length ? (
                <div className="mt-4 grid gap-3">
                  {subjects.slice(0, 8).map((item) => (
                    <div
                      key={item.subject}
                      className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm dark:border-slate-800"
                    >
                      <span>{item.subject}</span>
                      <strong>{item.count.toLocaleString("fa-IR")} آزمون</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="هنوز موضوعی برای آزمون ها ثبت نشده است." />
              )}
            </Card>
            <Card className="p-4">
              <h2 className="font-black text-ink">آزمون های نیازمند توجه</h2>
              <div className="mt-4 grid gap-3">
                {(exams.data || [])
                  .filter((exam) => !exam.published || !exam.delivery?.questionCount)
                  .slice(0, 6)
                  .map((exam) => (
                    <Link
                      className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-brand"
                      key={exam.id}
                      to="/admin/exams"
                    >
                      <span>{exam.title}</span>
                      <span className="text-xs text-amber-700">
                        {!exam.delivery?.questionCount ? "بدون سؤال" : "پیش نویس"}
                      </span>
                    </Link>
                  ))}
                {!(exams.data || []).some(
                  (exam) => !exam.published || !exam.delivery?.questionCount,
                ) ? (
                  <EmptyState title="مورد نیازمند توجه وجود ندارد." />
                ) : null}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
