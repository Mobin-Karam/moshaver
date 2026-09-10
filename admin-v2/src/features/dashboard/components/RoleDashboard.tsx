import { Link } from "react-router-dom";
import {
  Activity,
  BookOpenCheck,
  Building2,
  CalendarDays,
  FileQuestion,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../auth";
import { Badge, Button, Card, EmptyState, LoadingState } from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import type { AttentionStudent, RoleDashboardData } from "../model/dashboard.types";
import { quickActionsForRole } from "../model/role-experience";
import { AttentionInbox } from "./AttentionInbox";

type Metric = {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone: "green" | "blue" | "amber" | "red";
};
const roleCopy: Record<string, { title: string; description: string }> = {
  GUARDIAN: {
    title: "نمای خانواده",
    description: "برنامه، پیشرفت و ارتباط با تیم آموزشی فرزندتان",
  },
  ADVISOR: {
    title: "میز کار مشاور",
    description: "پیگیری برنامه‌ها، درخواست‌ها و دانش‌آموزان نیازمند توجه",
  },
  TEACHER: { title: "میز کار دبیر", description: "کلاس‌ها، آزمون‌ها و الگوهای خطای دانش‌آموزان" },
  MENTOR: { title: "میز کار منتور", description: "هدف‌ها، روند روزانه و گفت‌وگوهای دانش‌آموزان" },
  CONTENT_MANAGER: {
    title: "استودیوی محتوای آموزشی",
    description: "درس‌ها، سؤال‌ها، آزمون‌ها و آزمونک‌های در حال انتشار",
  },
  ORGANIZATION_ADMIN: {
    title: "مدیریت سازمان",
    description: "اعضا، کارکنان، دانش‌آموزان و سلامت عملیاتی سازمان",
  },
  PLATFORM_ADMIN: {
    title: "فرماندهی پلتفرم",
    description: "سازمان‌ها، کاربران، امنیت و نسخه‌های در حال اجرا",
  },
};
const n = (value: unknown) => (typeof value === "number" ? value : 0);

export function roleDashboardMetrics(data: RoleDashboardData): Metric[] {
  const common: Metric[] = [
    {
      label: "دانش‌آموز تحت پوشش",
      value: n(data.assignedStudents),
      hint: "در محدوده نقش فعال",
      icon: UsersRound,
      tone: "green",
    },
    {
      label: "پیام خوانده‌نشده",
      value: n(data.unreadConversations),
      hint: "گفت‌وگوهای نیازمند پاسخ",
      icon: MessageSquare,
      tone: "blue",
    },
  ];
  switch (data.context) {
    case "GUARDIAN":
      return [
        {
          label: "فرزندان",
          value: n(data.children),
          hint: "پروفایل‌های متصل و تأییدشده",
          icon: UsersRound,
          tone: "green",
        },
        common[1],
      ];
    case "ADVISOR":
      return [
        ...common,
        {
          label: "نیازمند توجه",
          value: n(data.attentionStudents),
          hint: "دانش‌آموز با پیگیری باز",
          icon: Activity,
          tone: "red",
        },
        {
          label: "درخواست بازیابی",
          value: n(data.recoveryRequests),
          hint: "در انتظار تصمیم",
          icon: RefreshCw,
          tone: "amber",
        },
        {
          label: "مسئله فعالیت",
          value: n(data.taskIssues),
          hint: "گزارش باز دانش‌آموز",
          icon: CalendarDays,
          tone: "amber",
        },
        {
          label: "تلاش مجدد",
          value: n(data.retryRequests),
          hint: "درخواست آزمون",
          icon: BookOpenCheck,
          tone: "blue",
        },
      ];
    case "TEACHER":
      return [
        ...common,
        {
          label: "درس فعال",
          value: Array.isArray(data.subjects) ? data.subjects.length : 0,
          hint: "درس‌های تخصیص‌یافته",
          icon: BookOpenCheck,
          tone: "blue",
        },
        {
          label: "خطای باز",
          value: n(data.studentsNeedingAttention),
          hint: "نیازمند مرور آموزشی",
          icon: Activity,
          tone: "red",
        },
        {
          label: "بانک سؤال",
          value: n(data.contentTasks?.questions),
          hint: "سؤال‌های آماده",
          icon: FileQuestion,
          tone: "amber",
        },
      ];
    case "MENTOR":
      return [
        ...common,
        {
          label: "برنامه امروز",
          value: n(data.recentProgress?.plans),
          hint: "برنامه‌های تحت پیگیری",
          icon: CalendarDays,
          tone: "green",
        },
        {
          label: "هدف پیش‌رو",
          value: data.upcomingGoals?.length || 0,
          hint: "آزمون و هدف آینده",
          icon: BookOpenCheck,
          tone: "amber",
        },
      ];
    case "CONTENT_MANAGER":
      return [
        {
          label: "درس",
          value: n(data.subjects),
          hint: "درس‌های فعال",
          icon: BookOpenCheck,
          tone: "green",
        },
        {
          label: "سؤال",
          value: n(data.questions),
          hint: "بانک محتوای آزمون",
          icon: FileQuestion,
          tone: "blue",
        },
        {
          label: "آزمونک",
          value: n(data.quizzes),
          hint: `${fa(n(data.draftCount))} پیش‌نویس`,
          icon: BookOpenCheck,
          tone: "amber",
        },
        {
          label: "آزمون",
          value: n(data.exams),
          hint: "محتوای ارزیابی",
          icon: CalendarDays,
          tone: "red",
        },
      ];
    case "ORGANIZATION_ADMIN":
      return [
        {
          label: "اعضای فعال",
          value: n(data.members),
          hint: "عضویت معتبر سازمان",
          icon: UsersRound,
          tone: "green",
        },
        {
          label: "دانش‌آموز",
          value: n(data.students),
          hint: "حساب آموزشی",
          icon: UsersRound,
          tone: "blue",
        },
        {
          label: "کارکنان",
          value: n(data.staff),
          hint: "تیم سازمان",
          icon: ShieldCheck,
          tone: "amber",
        },
        {
          label: "کاربر غیرفعال",
          value: n(data.inactiveUsers),
          hint: "نیازمند بررسی حساب",
          icon: Activity,
          tone: "red",
        },
      ];
    case "PLATFORM_ADMIN":
      return [
        {
          label: "سازمان",
          value: n(data.organizations),
          hint: "محدوده‌های پلتفرم",
          icon: Building2,
          tone: "green",
        },
        {
          label: "کاربر",
          value: n(data.users),
          hint: "تمام حساب‌های سامانه",
          icon: UsersRound,
          tone: "blue",
        },
        {
          label: "رویداد امنیتی",
          value: n(data.auditSummary?.events24h),
          hint: "در ۲۴ ساعت گذشته",
          icon: ShieldCheck,
          tone: "amber",
        },
        {
          label: "ورود قفل‌شده",
          value: n(data.auditSummary?.lockedLogins),
          hint: "محدودیت فعال ورود",
          icon: Activity,
          tone: "red",
        },
      ];
    default:
      return common;
  }
}
const metrics = roleDashboardMetrics;

function QuickActions() {
  const auth = useAuth();
  const actions = quickActionsForRole(auth.activeRole, auth.capabilities);
  return (
    <Card>
      <h2 className="font-black">دسترسی سریع</h2>
      <p className="mt-1 text-xs text-slate-500">
        فقط ابزارهای مجاز برای نقش فعال نمایش داده می‌شوند.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-ink transition hover:border-brand/40 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 dark:border-slate-800"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function RoleDashboard({
  data,
  loading,
  error,
  refreshing,
  attention,
  attentionLoading,
  attentionError,
  onRefresh,
  onRetry,
  onRetryAttention,
}: {
  data?: RoleDashboardData;
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  attention: AttentionStudent[];
  attentionLoading: boolean;
  attentionError: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onRetryAttention: () => void;
}) {
  const auth = useAuth(),
    copy = roleCopy[data?.context || auth.activeRole || ""] || {
      title: "داشبورد",
      description: "نمای کلی فضای کاری شما",
    };
  if (loading) return <LoadingState label="در حال آماده‌سازی میز کار نقش فعال…" />;
  if (error || !data)
    return (
      <EmptyState
        title="داشبورد این نقش دریافت نشد."
        action={
          <Button variant="soft" onClick={onRetry}>
            <RefreshCw size={16} />
            تلاش دوباره
          </Button>
        }
      />
    );
  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden bg-gradient-to-l from-brand/10 via-white to-sky-50 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone="blue">{data.context}</Badge>
            <h1 className="mt-3 text-xl font-black text-ink sm:text-2xl">{copy.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.description}</p>
          </div>
          <Button variant="soft" loading={refreshing} onClick={onRefresh}>
            <RefreshCw size={16} />
            به‌روزرسانی
          </Button>
        </div>
      </Card>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics(data).map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="group">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                  <strong className="mt-3 block text-3xl font-black text-ink">
                    {typeof item.value === "number" ? fa(item.value) : item.value}
                  </strong>
                  <p className="mt-2 text-[11px] text-slate-500">{item.hint}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:scale-105">
                  <Icon size={19} />
                </span>
              </div>
            </Card>
          );
        })}
      </section>
      <QuickActions />
      {auth.can("student.live.read") ? (
        <AttentionInbox
          students={attention}
          loading={attentionLoading}
          error={attentionError}
          onRetry={onRetryAttention}
        />
      ) : null}
    </div>
  );
}
