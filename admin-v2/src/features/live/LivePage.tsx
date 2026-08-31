import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Clock3,
  ExternalLink,
  MessageCircle,
  PauseCircle,
  RefreshCw,
  Search,
  Users,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../../shared/ui/locale";
import { Badge, Button, Card, EmptyState, Select } from "../../shared/ui/ui";
import { fa, normalizePersianText } from "../../shared/lib/utils";
import { api } from "../../shared/api/api";

export type LiveState =
  "online" | "offline" | "studying" | "paused" | "taking_exam";
export type LiveStudent = {
  id: string;
  name: string;
  grade?: string;
  major?: string;
  state: LiveState;
  freshness: "live" | "recent" | "stale" | "offline";
  presence?: { online?: boolean; lastSeenAt?: string; deviceLabel?: string };
  activeSession?: { startedAt?: string; title?: string; subject?: string };
  currentView?: string;
  dueReviews: number;
  remainingTasks: number;
  lastExamPercent: number | null;
  lastActivityAt?: string | null;
};
export type LiveEvent = {
  id: string;
  studentId: string;
  studentName: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};
type Snapshot = {
  generatedAt?: string;
  summary?: {
    total?: number;
    online?: number;
    studying?: number;
    paused?: number;
    takingExam?: number;
    attention?: number;
  };
  students?: LiveStudent[];
  timeline?: LiveEvent[];
};
export type LiveFilter = "all" | LiveState | "attention";

export function needsAttention(s: LiveStudent) {
  return (
    s.dueReviews >= 3 || (s.lastExamPercent != null && s.lastExamPercent < 50)
  );
}
export function filterLiveStudents(
  list: LiveStudent[],
  search: string,
  filter: LiveFilter,
) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  return list.filter((s) => {
    const searchable = normalizePersianText(
      [s.name, s.grade, s.major, s.currentView].filter(Boolean).join(" "),
    ).toLocaleLowerCase("fa");
    const state =
      filter === "all" ||
      (filter === "attention" && needsAttention(s)) ||
      (filter === "online" && !!s.presence?.online) ||
      s.state === filter;
    return (!needle || searchable.includes(needle)) && state;
  });
}

export function LivePage() {
  const qc = useQueryClient(),
    { formatDateTime } = useLocale();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState<LiveFilter>("all"),
    [clock, setClock] = useState(Date.now());
  const live = useQuery({
    queryKey: ["live-students"],
    queryFn: () => api.get<Snapshot>("/admin/realtime/students?limit=100"),
    refetchInterval: 15000,
  });
  useEffect(() => {
    const source = api.openEvents(() =>
      qc.invalidateQueries({ queryKey: ["live-students"] }),
    );
    return () => source.close();
  }, [qc]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const students = useMemo(
    () => filterLiveStudents(live.data?.students || [], search, filter),
    [filter, live.data?.students, search],
  );
  const summary = live.data?.summary || {};
  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-brand">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            عملیات بلادرنگ
          </div>
          <h2 className="text-2xl font-black">نمای زنده همه دانش‌آموزان</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            در یک نگاه ببینید چه کسی آنلاین، در حال مطالعه یا نیازمند پیگیری
            است.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">
            {live.data?.generatedAt
              ? `آخرین همگام‌سازی: ${formatDateTime(live.data.generatedAt)}`
              : "در انتظار اولین همگام‌سازی"}
          </span>
          <Button
            variant="soft"
            loading={live.isFetching}
            loadingLabel="در حال دریافت"
            onClick={() => live.refetch()}
          >
            <RefreshCw size={16} />
            تازه‌سازی
          </Button>
        </div>
      </header>
      {live.isError ? (
        <Card className="border-rose-200 bg-rose-50 text-rose-800">
          <strong>دریافت وضعیت زنده ممکن نشد.</strong>
          <p className="mt-1 text-sm">
            اتصال را بررسی کنید و دوباره تلاش کنید.
          </p>
          <Button
            className="mt-3"
            variant="danger"
            onClick={() => live.refetch()}
          >
            تلاش دوباره
          </Button>
        </Card>
      ) : null}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Summary
          icon={Users}
          label="همه"
          value={summary.total}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <Summary
          icon={Wifi}
          label="آنلاین"
          value={summary.online}
          tone="green"
          active={filter === "online"}
          onClick={() => setFilter("online")}
        />
        <Summary
          icon={BookOpenCheck}
          label="در حال مطالعه"
          value={summary.studying}
          tone="blue"
          active={filter === "studying"}
          onClick={() => setFilter("studying")}
        />
        <Summary
          icon={PauseCircle}
          label="توقف"
          value={summary.paused}
          tone="amber"
          active={filter === "paused"}
          onClick={() => setFilter("paused")}
        />
        <Summary
          icon={Clock3}
          label="در حال آزمون"
          value={summary.takingExam}
          tone="blue"
          active={filter === "taking_exam"}
          onClick={() => setFilter("taking_exam")}
        />
        <Summary
          icon={AlertTriangle}
          label="نیازمند توجه"
          value={summary.attention}
          tone="red"
          active={filter === "attention"}
          onClick={() => setFilter("attention")}
        />
      </section>
      <Card className="p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto]">
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-teal-100">
            <Search size={16} className="text-slate-400" />
            <input
              aria-label="جستجوی دانش‌آموز"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="نام، پایه، رشته یا صفحه فعلی…"
            />
          </label>
          <Select
            aria-label="فیلتر وضعیت"
            value={filter}
            onChange={(e) => setFilter(e.target.value as LiveFilter)}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="online">آنلاین</option>
            <option value="studying">در حال مطالعه</option>
            <option value="paused">متوقف</option>
            <option value="taking_exam">در حال آزمون</option>
            <option value="attention">نیازمند توجه</option>
            <option value="offline">آفلاین</option>
          </Select>
          <span className="self-center text-xs text-slate-500">
            نمایش {fa(students.length)} از {fa(summary.total || 0)}
          </span>
        </div>
      </Card>
      {live.isLoading ? (
        <Skeleton />
      ) : students.length ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {students.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              now={clock}
              formatDateTime={formatDateTime}
            />
          ))}
        </section>
      ) : (
        <Card>
          <EmptyState title="دانش‌آموزی با این جستجو یا فیلتر پیدا نشد." />
        </Card>
      )}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-brand" />
            <h3 className="font-black">خط زمانی همه دانش‌آموزان</h3>
          </div>
          <Badge>{fa(live.data?.timeline?.length || 0)} رویداد اخیر</Badge>
        </div>
        {live.data?.timeline?.length ? (
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-auto">
            {live.data.timeline.slice(0, 60).map((e) => (
              <Timeline key={e.id} event={e} formatDateTime={formatDateTime} />
            ))}
          </div>
        ) : !live.isLoading ? (
          <EmptyState title="هنوز رویدادی ثبت نشده است." />
        ) : null}
      </Card>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value = 0,
  tone = "neutral",
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  active: boolean;
  onClick: () => void;
}) {
  const color = {
    neutral: "text-slate-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-rose-600",
    blue: "text-sky-600",
  }[tone];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-brand ring-2 ring-teal-100" : "border-slate-200"}`}
    >
      <span className={`flex items-center gap-2 text-xs ${color}`}>
        <Icon size={16} />
        {label}
      </span>
      <strong className="mt-2 block text-2xl">{fa(value)}</strong>
    </button>
  );
}
function StudentCard({
  student: s,
  now,
  formatDateTime,
}: {
  student: LiveStudent;
  now: number;
  formatDateTime: (value?: string | Date) => string;
}) {
  const attention = needsAttention(s);
  return (
    <Card
      className={`relative overflow-hidden p-0 ${attention ? "border-amber-200" : ""}`}
    >
      <div
        className={`h-1 ${s.freshness === "live" ? "bg-emerald-500" : s.freshness === "recent" ? "bg-sky-400" : s.freshness === "stale" ? "bg-amber-400" : "bg-slate-300"}`}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-brand">
            {s.name.slice(0, 1)}
            <span
              className={`absolute bottom-0 left-0 size-3 rounded-full border-2 border-white ${s.presence?.online ? "bg-emerald-500" : "bg-slate-400"}`}
            />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate">{s.name}</strong>
            <small className="text-slate-500">
              {[s.grade, s.major].filter(Boolean).join(" • ") ||
                "بدون مشخصات تحصیلی"}
            </small>
          </div>
          <Badge tone={stateTone(s.state)}>{stateLabel(s.state)}</Badge>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <small className="text-slate-500">فعالیت فعلی</small>
          <strong className="mt-1 block truncate text-sm">
            {s.activeSession?.title ||
              s.currentView ||
              (s.presence?.online ? "داخل برنامه" : "بدون فعالیت جاری")}
          </strong>
          <span className="mt-1 block text-xs text-slate-500">
            {s.activeSession?.subject ||
              s.presence?.deviceLabel ||
              (s.lastActivityAt
                ? `آخرین حضور ${formatDateTime(s.lastActivityAt)}`
                : "بدون سابقه حضور")}
          </span>
          {s.activeSession?.startedAt ? (
            <strong
              className="mt-2 block font-mono text-lg tabular-nums text-brand"
              dir="ltr"
            >
              {elapsed(now, s.activeSession.startedAt)}
            </strong>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="کار باقی‌مانده" value={fa(s.remainingTasks)} />
          <Mini
            label="مرور سررسید"
            value={fa(s.dueReviews)}
            warn={s.dueReviews >= 3}
          />
          <Mini
            label="آخرین آزمون"
            value={
              s.lastExamPercent == null ? "—" : `${fa(s.lastExamPercent)}٪`
            }
            warn={s.lastExamPercent != null && s.lastExamPercent < 50}
          />
        </div>
        {attention ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <AlertTriangle size={15} />
            این دانش‌آموز نیازمند پیگیری است.
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50"
            to={`/admin/students?studentId=${encodeURIComponent(s.id)}`}
          >
            <ExternalLink size={15} />
            پرونده
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white hover:bg-teal-800"
            to={`/admin/chat?studentId=${encodeURIComponent(s.id)}`}
          >
            <MessageCircle size={15} />
            پیام
          </Link>
        </div>
      </div>
    </Card>
  );
}
function Mini({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2 ${warn ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}
    >
      <strong className="block text-sm">{value}</strong>
      <small className="text-[10px] text-slate-500">{label}</small>
    </div>
  );
}
function Timeline({
  event: e,
  formatDateTime,
}: {
  event: LiveEvent;
  formatDateTime: (value?: string | Date) => string;
}) {
  return (
    <article className="flex gap-3 p-4 hover:bg-slate-50">
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-teal-50 text-brand">
        <Activity size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <strong className="text-sm">
          {e.studentName} — {activityLabel(e.eventType)}
        </strong>
        <p className="mt-1 truncate text-xs text-slate-500">
          {activityMeta(e)}
        </p>
      </div>
      <time className="shrink-0 text-[11px] text-slate-400">
        {formatDateTime(e.createdAt)}
      </time>
    </article>
  );
}
function Skeleton() {
  return (
    <section
      className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
      aria-label="در حال دریافت وضعیت زنده"
    >
      {[1, 2, 3, 4, 5, 6].map((x) => (
        <Card key={x} className="h-72 animate-pulse bg-slate-100" />
      ))}
    </section>
  );
}
function stateLabel(s: LiveState) {
  return (
    (
      {
        online: "آنلاین",
        offline: "آفلاین",
        studying: "مطالعه",
        paused: "توقف",
        taking_exam: "آزمون",
      } as const
    )[s] || s
  );
}
function stateTone(s: LiveState): "neutral" | "green" | "amber" | "blue" {
  return s === "studying" || s === "online"
    ? "green"
    : s === "paused"
      ? "amber"
      : s === "taking_exam"
        ? "blue"
        : "neutral";
}
function elapsed(now: number, start: string) {
  const n = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}
function activityLabel(t: string) {
  return (
    (
      {
        "study.started": "شروع مطالعه",
        "study.paused": "توقف مطالعه",
        "study.resumed": "ادامه مطالعه",
        "study.finished": "پایان مطالعه",
        "task.done": "فعالیت انجام شد",
        "task.partial": "فعالیت نیمه‌کاره",
        "exam.started": "شروع آزمون",
        "exam.submitted": "ثبت آزمون",
        "screen.viewed": "مشاهده صفحه",
      } as Record<string, string>
    )[t] || t.replaceAll(".", " ")
  );
}
function activityMeta(e: LiveEvent) {
  const d = e.metadata || {};
  return String(
    d.title ||
      d.subject ||
      d.viewLabel ||
      d.view ||
      d.message ||
      "جزئیات بیشتری ثبت نشده است.",
  );
}
