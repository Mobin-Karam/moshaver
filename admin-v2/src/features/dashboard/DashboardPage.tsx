import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Card, EmptyState, LoadingState } from "../../shared/ui/ui";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import { useStudents } from "../../shared/hooks/useStudents";
import { api } from "../../shared/api/api";
import { fa } from "../../shared/lib/utils";
import type { Conversation } from "../../shared/types/domain";

type DashboardOverview = {
  health?: number;
  todayMetrics?: {
    doneTasks?: number;
    partialTasks?: number;
    totalTasks?: number;
    actualMinutes?: number;
    actualTests?: number;
    plannedTests?: number;
  };
};

type AdvisorInbox = {
  issues?: unknown[];
  recoveryRequests?: unknown[];
  reviews?: unknown[];
  missedTasks?: unknown[];
  examRetryRequests?: unknown[];
};

export function DashboardPage() {
  const students = useStudents();
  const overview = useQuery({
    queryKey: ["overview", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<DashboardOverview>(
        `/admin/students/${students.studentId}/overview`,
      ),
  });
  const inbox = useQuery({
    queryKey: ["inbox", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<AdvisorInbox>(
        `/admin/advisor-inbox?studentId=${encodeURIComponent(students.studentId)}`,
      ),
  });
  const chat = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => api.get<Conversation[]>("/admin/chat/conversations"),
  });
  const metrics = overview.data?.todayMetrics ?? {};
  const unread = (chat.data ?? [])
    .filter((c) => c.student?.id === students.studentId)
    .reduce((sum, c) => sum + Number(c.unread || 0), 0);
  const inboxKeys: Array<keyof AdvisorInbox> = [
    "issues",
    "recoveryRequests",
    "reviews",
    "missedTasks",
    "examRetryRequests",
  ];
  const inboxCount = inboxKeys.reduce(
    (sum, key) => sum + (inbox.data?.[key]?.length || 0),
    unread,
  );
  const attentionRows: Array<[string, number | undefined, LucideIcon]> = [
    ["گزارش مشکل", inbox.data?.issues?.length, AlertTriangle],
    ["ریکاوری", inbox.data?.recoveryRequests?.length, Clock3],
    ["مرور عقب‌افتاده", inbox.data?.reviews?.length, CheckCircle2],
    ["فعالیت انجام‌نشده", inbox.data?.missedTasks?.length, AlertTriangle],
    ["پیام خوانده‌نشده", unread, MessageSquare],
  ];

  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <div className="w-full md:w-72">
          <StudentPicker
            students={students.students}
            value={students.studentId}
            onChange={students.setStudentId}
          />
        </div>
      </div>
      {overview.isLoading ? (
        <LoadingState />
      ) : (
        <section className="grid gap-3 md:grid-cols-4">
          <Card>
            <span className="text-sm text-slate-500">اجرای امروز</span>
            <strong className="mt-2 block text-2xl">
              {fa((metrics.doneTasks || 0) + (metrics.partialTasks || 0))}/
              {fa(metrics.totalTasks || 0)}
            </strong>
            <small>{fa(metrics.actualMinutes || 0)} دقیقه</small>
          </Card>
          <Card>
            <span className="text-sm text-slate-500">سلامت</span>
            <strong className="mt-2 block text-2xl">
              {fa(overview.data?.health || 82)}%
            </strong>
            <small>بر اساس تکمیل، آزمون و هشدارها</small>
          </Card>
          <Card>
            <span className="text-sm text-slate-500">تست امروز</span>
            <strong className="mt-2 block text-2xl">
              {fa(metrics.actualTests || 0)}
            </strong>
            <small>هدف {fa(metrics.plannedTests || 0)}</small>
          </Card>
          <Card>
            <span className="text-sm text-slate-500">موارد توجه</span>
            <strong className="mt-2 block text-2xl">{fa(inboxCount)}</strong>
            <small>پیام، ریکاوری، ریسک آزمون</small>
          </Card>
        </section>
      )}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <Card>
          <h3 className="mb-3 font-bold">صندوق توجه</h3>
          {inboxCount ? (
            <div className="grid gap-2">
              {attentionRows.map(([label, count, Icon]) =>
                Number(count) ? (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-md bg-slate-50 p-3"
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={17} />
                      {label}
                    </span>
                    <strong>{fa(count)}</strong>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <EmptyState title="مورد فوری برای پیگیری وجود ندارد." />
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">فعالیت امروز</h3>
          <div className="grid gap-3 text-sm">
            <p>
              <strong>07:00</strong> روان‌شناسی
            </p>
            <p>
              <strong>09:00</strong> آزمون
            </p>
            <p>
              <strong>11:00</strong> مرور
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
