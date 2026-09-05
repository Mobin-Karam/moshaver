import {
  CalendarCheck2,
  ClipboardCheck,
  GraduationCap,
  RefreshCw,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Button, Card, Badge } from "../../../shared/ui/ui";

import { fa } from "../../../shared/lib/utils";

import type { AdminDashboardSummary } from "../model/dashboard.types";

type Metric = {
  label: string;

  value: number;

  hint: string;

  icon: LucideIcon;

  status: string;

  tone: "green" | "blue" | "amber" | "red";
};

const icons = {
  green: "bg-brand/10 text-brand",

  blue: "bg-blue-500/10 text-blue-600",

  amber: "bg-amber-500/10 text-amber-600",

  red: "bg-rose-500/10 text-rose-600",
};

export function DashboardMetricCards({
  summary,
  refreshing,
  onRefresh,
}: {
  summary: AdminDashboardSummary;
  refreshing?: boolean;
  onRefresh: () => void;
}) {
  const metrics: Metric[] = [
    {
      label: "دانش‌آموز فعال",
      value: summary.students,
      hint: "حساب‌های فعال سامانه",
      icon: UsersRound,
      status: "فعال",
      tone: "green",
    },

    {
      label: "برنامه امروز",
      value: summary.todayPlans,
      hint: "برنامه آماده اجرا",
      icon: CalendarCheck2,
      status: "امروز",
      tone: "blue",
    },

    {
      label: "گزارش امروز",
      value: summary.todayReports,
      hint: "گزارش ثبت شده",
      icon: ClipboardCheck,
      status: "دریافت شده",
      tone: "amber",
    },

    {
      label: "آزمون پیش‌رو",
      value: summary.upcomingExams,
      hint: "آزمون‌های آینده",
      icon: GraduationCap,
      status: "در انتظار",
      tone: "red",
    },
  ];

  return (
    <div
      className="
grid
gap-4

sm:grid-cols-2

xl:grid-cols-[160px_repeat(4,minmax(0,1fr))]

"
    >
      <Card
        className="
flex
items-center
justify-center
"
      >
        <Button
          variant="soft"
          loading={refreshing}
          onClick={onRefresh}
          className="
h-12
px-5
"
        >
          <RefreshCw size={17} />
          بروزرسانی
        </Button>
      </Card>

      {metrics.map((item) => {
        const Icon = item.icon;

        return (
          <Card
            key={item.label}
            className="
group
p-5

hover:-translate-y-1

hover:shadow-md

"
          >
            <div
              className="
flex
items-start
justify-between
"
            >
              <div>
                <p
                  className="
text-xs
font-semibold
text-slate-500
dark:text-slate-400
"
                >
                  {item.label}
                </p>

                <strong
                  className="
mt-3
block

text-4xl

font-black

tracking-tight

text-[rgb(var(--color-ink))]

"
                >
                  {fa(item.value)}
                </strong>
              </div>

              <div
                className={`
grid
size-11
place-items-center
rounded-2xl

transition

group-hover:scale-110

${icons[item.tone]}

`}
              >
                <Icon size={22} />
              </div>
            </div>

            <div
              className="
mt-5
flex
items-center
justify-between
"
            >
              <p
                className="
text-[11px]
text-slate-400
"
              >
                {item.hint}
              </p>

              <Badge tone={item.tone}>● {item.status}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
