import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Clock3,
  Wifi,
} from "lucide-react";
import { useEffect } from "react";
import { StudentPicker } from "../../components/StudentPicker";
import { Badge, Card, EmptyState, LoadingState } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { fa } from "../../lib/utils";
import { api } from "../../services/api";

type LiveData = {
  student?: { name?: string };
  presence?: { online?: boolean; state?: string; lastSeenAt?: string };
  activeSession?: { startedAt?: string; actualMinutes?: number };
  currentTask?: {
    subject?: string;
    title?: string;
    start?: string;
    end?: string;
  };
  planProgress?: {
    total?: number;
    done?: number;
    partial?: number;
    skipped?: number;
  };
  todayStudy?: { minutes?: number; sessions?: number };
  lastAttempt?: { title?: string; percent?: number };
  issues?: unknown[];
  dueReviews?: unknown[];
  activity?: Array<Record<string, unknown>>;
};

export function LivePage() {
  const students = useStudents();
  const qc = useQueryClient();
  const live = useQuery({
    queryKey: ["live", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<LiveData>(
        `/admin/live?studentId=${encodeURIComponent(students.studentId)}`,
      ),
    refetchInterval: 15_000,
  });
  useEffect(() => {
    const source = api.openEvents(() =>
      qc.invalidateQueries({ queryKey: ["live", students.studentId] }),
    );
    return () => source.close();
  }, [qc, students.studentId]);
  const data = live.data;
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">فعالیت زنده</h2>
          <p className="text-slate-500">
            حضور، مطالعه، برنامه، آزمون و هشدارها با به‌روزرسانی بلادرنگ
          </p>
        </div>
        <div className="w-full md:w-72">
          <StudentPicker
            students={students.students}
            value={students.studentId}
            onChange={students.setStudentId}
          />
        </div>
      </div>
      {live.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Metric
              icon={Wifi}
              label="وضعیت"
              value={data?.presence?.online ? "آنلاین" : "آفلاین"}
            />
            <Metric
              icon={Clock3}
              label="مطالعه امروز"
              value={`${fa(data?.todayStudy?.minutes || 0)} دقیقه`}
            />
            <Metric
              icon={BookOpenCheck}
              label="پیشرفت برنامه"
              value={`${fa(data?.planProgress?.done || 0)} از ${fa(data?.planProgress?.total || 0)}`}
            />
            <Metric
              icon={AlertTriangle}
              label="نیازمند توجه"
              value={fa(
                (data?.issues?.length || 0) + (data?.dueReviews?.length || 0),
              )}
            />
          </section>
          <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">فعالیت فعلی</h3>
                <Badge tone={data?.presence?.online ? "green" : "neutral"}>
                  {data?.presence?.state ||
                    (data?.presence?.online ? "online" : "offline")}
                </Badge>
              </div>
              {data?.currentTask ? (
                <div className="rounded-md bg-teal-50 p-4">
                  <strong>
                    {[data.currentTask.subject, data.currentTask.title]
                      .filter(Boolean)
                      .join(" - ")}
                  </strong>
                  <p className="mt-2 text-sm text-slate-600">
                    {data.currentTask.start || "--:--"} تا{" "}
                    {data.currentTask.end || "--:--"}
                  </p>
                </div>
              ) : (
                <EmptyState title="فعالیت فعالی وجود ندارد." />
              )}
              {data?.lastAttempt ? (
                <div className="mt-3 rounded-md border p-3 text-sm">
                  <strong>آخرین آزمون: {data.lastAttempt.title}</strong>
                  <span className="mr-2">
                    {fa(data.lastAttempt.percent || 0)}٪
                  </span>
                </div>
              ) : null}
            </Card>
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Activity size={18} />
                <h3 className="font-bold">خط زمانی رویدادها</h3>
              </div>
              {data?.activity?.length ? (
                <div className="grid max-h-[520px] gap-2 overflow-auto">
                  {data.activity.map((item, index) => (
                    <article
                      key={String(item.id || index)}
                      className="rounded-md border-r-4 border-brand bg-slate-50 p-3 text-sm"
                    >
                      <strong>
                        {String(
                          item.title ||
                            item.type ||
                            item.event_type ||
                            "رویداد",
                        )}
                      </strong>
                      <p className="mt-1 text-slate-500">
                        {String(
                          item.description ||
                            item.message ||
                            item.createdAt ||
                            item.created_at ||
                            "",
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="رویدادی ثبت نشده است." />
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-3">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={15} />
        {label}
      </span>
      <strong className="mt-2 block text-xl">{value}</strong>
    </Card>
  );
}
