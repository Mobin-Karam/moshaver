import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, GraduationCap, Heart, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth";
import { notify } from "../../../shared/ui/notifications";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Select,
  Textarea,
} from "../../../shared/ui/ui";
import { guardianApi } from "../api/guardian.api";

const fa = (value: number) => value.toLocaleString("fa-IR");

export function GuardianPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const children = useQuery({ queryKey: ["guardian", "students"], queryFn: guardianApi.students });
  const relatedStudents = useQuery({
    queryKey: ["guardian", "relationships"],
    queryFn: guardianApi.relatedStudents,
  });
  const resources = useQuery({
    queryKey: ["guardian", studentId, "resources"],
    queryFn: () => guardianApi.assignedResources(studentId),
    enabled: Boolean(studentId),
  });
  useEffect(() => {
    if (!studentId && children.data?.[0]) setStudentId(children.data[0].id);
  }, [children.data, studentId]);

  const enabled = Boolean(studentId);
  const dashboard = useQuery({
    queryKey: ["guardian", studentId, "dashboard"],
    queryFn: () => guardianApi.dashboard(studentId),
    enabled,
  });
  const progress = useQuery({
    queryKey: ["guardian", studentId, "progress"],
    queryFn: () => guardianApi.progress(studentId),
    enabled,
  });
  const schedule = useQuery({
    queryKey: ["guardian", studentId, "schedule"],
    queryFn: () => guardianApi.schedule(studentId),
    enabled,
  });
  const exams = useQuery({
    queryKey: ["guardian", studentId, "exams"],
    queryFn: () => guardianApi.exams(studentId),
    enabled,
  });
  const reports = useQuery({
    queryKey: ["guardian", studentId, "reports"],
    queryFn: () => guardianApi.reports(studentId),
    enabled,
  });
  const detailQueries = [dashboard, progress, schedule, exams, reports];
  const encouragement = useMutation({
    mutationFn: () => guardianApi.encourage(studentId, { message, kind: "SUPPORT" }),
    onSuccess: async () => {
      setMessage("");
      notify("پیام دلگرم‌کننده برای دانش‌آموز فرستاده شد.", "success");
      await queryClient.invalidateQueries({ queryKey: ["guardian", studentId] });
    },
    onError: () => notify("ارسال پیام دلگرم‌کننده انجام نشد.", "error"),
  });
  const loading = children.isLoading || (enabled && detailQueries.some((query) => query.isLoading));
  const failed = children.isError || detailQueries.some((query) => query.isError);
  const weekly = progress.data?.weekly ?? dashboard.data?.weekly;

  if (children.isLoading)
    return (
      <Card role="status" className="p-8 text-center">
        در حال دریافت اطلاعات خانواده…
      </Card>
    );
  if (children.isError)
    return (
      <ErrorState
        title="اطلاعات فرزندان دریافت نشد."
        action={
          <Button onClick={() => void children.refetch()}>
            <RefreshCw size={16} /> تلاش دوباره
          </Button>
        }
      />
    );
  if (!children.data?.length)
    return (
      <EmptyState
        title="فرزند فعالی به حساب شما متصل نیست."
        description="مدیر سازمان باید رابطه سرپرستی را فعال کند."
      />
    );

  return (
    <section className="grid gap-5">
      <header>
        <p className="text-xs font-bold text-brand">خانه خانواده</p>
        <h1 className="mt-1 text-2xl font-black">پیگیری برنامه و پیشرفت فرزند</h1>
      </header>
      <Card className="p-4">
        <Field label="انتخاب فرزند">
          <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {children.data.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
      {failed ? (
        <ErrorState
          title="بخشی از اطلاعات دریافت نشد."
          action={
            <Button
              variant="soft"
              onClick={() => void Promise.all(detailQueries.map((query) => query.refetch()))}
            >
              <RefreshCw size={16} /> دریافت دوباره
            </Button>
          }
        />
      ) : null}
      {loading ? (
        <Card role="status" className="p-8 text-center">
          در حال آماده‌سازی نمای فرزند…
        </Card>
      ) : null}
      {!loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="پیشرفت هفتگی" value={`${fa(weekly?.completionPercent ?? 0)}٪`} />
            <Metric
              label="فعالیت تکمیل‌شده"
              value={`${fa(weekly?.completedTasks ?? 0)} از ${fa(weekly?.totalTasks ?? 0)}`}
            />
            <Metric label="مطالعه هفتگی" value={`${fa(weekly?.studyMinutes ?? 0)} دقیقه`} />
            <Metric label="آزمون‌های پیش رو" value={fa(exams.data?.length ?? 0)} />
          </div>
          {dashboard.data?.attention.map((item) => (
            <Card
              key={item.type}
              className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            >
              {item.message}
            </Card>
          ))}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-black">
                <CalendarDays size={18} /> برنامه آینده
              </h2>
              <div className="mt-4 grid gap-3">
                {(schedule.data ?? []).map((plan) => (
                  <div key={plan.id} className="rounded-xl border p-3">
                    <strong>{plan.date}</strong>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {plan.tasks.map((task) => (
                        <Badge key={task.id} tone={task.completed ? "green" : "neutral"}>
                          {task.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {!schedule.data?.length ? (
                  <EmptyState title="برنامه آینده‌ای ثبت نشده است." />
                ) : null}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-black">
                <GraduationCap size={18} /> آزمون‌ها و گزارش‌ها
              </h2>
              <div className="mt-4 grid gap-2 text-sm">
                {(exams.data ?? []).slice(0, 5).map((exam) => (
                  <div key={exam.id} className="rounded-xl border p-3">
                    {exam.title ?? "آزمون"}
                  </div>
                ))}
                <p className="text-slate-500">
                  {fa(reports.data?.length ?? 0)} گزارش روزانه در دسترس است.
                </p>
              </div>
            </Card>
          </div>
          <Card className="p-5">
            <h2 className="font-black">منابع آموزشی مرتبط</h2>
            <p className="mt-1 text-xs text-slate-500">
              {relatedStudents.data?.find((item) => item.student.id === studentId)?.relationship
                .type === "GUARDIAN_OF"
                ? "دسترسی از رابطه فعال سرپرستی"
                : "منابع قابل مشاهده در حساب شما"}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(resources.data ?? []).map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border p-3 text-sm font-bold hover:border-brand"
                >
                  {resource.title}
                </a>
              ))}
              {!resources.isLoading && !resources.data?.length ? (
                <EmptyState title="منبع آموزشی تخصیص‌یافته‌ای وجود ندارد." />
              ) : null}
            </div>
          </Card>
          {auth.can("guardian.encouragement.create") ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-black">
                <Heart size={18} /> پیام دلگرم‌کننده
              </h2>
              <form
                className="mt-4 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  encouragement.mutate();
                }}
              >
                <Field label="متن پیام">
                  <Textarea
                    required
                    maxLength={500}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </Field>
                <Button
                  className="w-fit"
                  loading={encouragement.isPending}
                  disabled={!message.trim()}
                >
                  ارسال برای فرزند
                </Button>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </Card>
  );
}
