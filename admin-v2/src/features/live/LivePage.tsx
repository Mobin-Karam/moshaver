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
    [selectedId, setSelectedId] = useState(""),
    [panel, setPanel] = useState<"students" | "timeline">("students"),
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
    () => filterLiveStudents(live.data?.students || [], search, filter).sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)) || Number(!!b.presence?.online) - Number(!!a.presence?.online) || a.name.localeCompare(b.name, "fa")),
    [filter, live.data?.students, search],
  );
  const summary = live.data?.summary || {};
  const selected = students.find((student) => student.id === selectedId) || students[0];
  return (
    <div className="grid h-[calc(100dvh-132px)] min-h-0 gap-3 overflow-hidden lg:h-[calc(100dvh-96px)]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-bold text-brand">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            عملیات بلادرنگ
          </div>
        <div className="mr-auto flex flex-wrap items-center gap-3">
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
      <section className="grid shrink-0 grid-cols-3 gap-2 lg:grid-cols-6">
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
      <Card className="shrink-0 p-2">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-indigo-100">
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
          <div className="flex rounded-md bg-slate-100 p-1 lg:hidden"><button className={`rounded px-2 py-1 text-xs ${panel === "students" ? "bg-white font-bold shadow-sm" : ""}`} onClick={() => setPanel("students")}>دانش‌آموزان</button><button className={`rounded px-2 py-1 text-xs ${panel === "timeline" ? "bg-white font-bold shadow-sm" : ""}`} onClick={() => setPanel("timeline")}>رویدادها</button></div>
        </div>
      </Card>
      <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(360px,.9fr)_minmax(320px,.75fr)_minmax(300px,.65fr)]">
        <Card className={`${panel === "timeline" ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden p-0`}>
          <div className="flex items-center justify-between border-b px-3 py-2"><strong>صف عملیات دانش‌آموزان</strong><Badge tone={students.some(needsAttention) ? "red" : "green"}>{fa(students.filter(needsAttention).length)} نیازمند توجه</Badge></div>
          {live.isLoading ? <CompactSkeleton /> : students.length ? <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">{students.map((student) => <StudentRow key={student.id} student={student} active={selected?.id === student.id} now={clock} onClick={() => setSelectedId(student.id)} />)}</div> : <EmptyState title="دانش‌آموزی با این جستجو یا فیلتر پیدا نشد." />}
        </Card>
        <Card className="hidden min-h-0 flex-col overflow-hidden p-0 lg:flex">
          <div className="border-b px-3 py-2"><strong>کنترل سریع</strong><p className="text-xs text-slate-500">جزئیات فقط برای مورد انتخاب‌شده</p></div>
          {selected ? <StudentDetail student={selected} now={clock} formatDateTime={formatDateTime} /> : <EmptyState title="یک دانش‌آموز را انتخاب کنید." />}
        </Card>
        <Card className={`${panel === "students" ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden p-0`}>
          <div className="flex items-center justify-between border-b px-3 py-2"><span className="flex items-center gap-2"><Activity size={17} className="text-brand" /><strong>رویدادهای اخیر</strong></span><Badge>{fa(live.data?.timeline?.length || 0)}</Badge></div>
          {live.data?.timeline?.length ? <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">{live.data.timeline.map((event) => <Timeline key={event.id} event={event} formatDateTime={formatDateTime} />)}</div> : !live.isLoading ? <EmptyState title="هنوز رویدادی ثبت نشده است." /> : <CompactSkeleton />}
        </Card>
      </section>
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
      className={`flex min-w-0 items-center gap-2 rounded-lg border bg-white px-2 py-2 text-right shadow-sm transition hover:border-brand ${active ? "border-brand ring-2 ring-indigo-100" : "border-slate-200"}`}
    >
      <span className={`grid size-7 shrink-0 place-items-center rounded-md bg-slate-50 ${color}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0"><strong className="block text-base leading-5">{fa(value)}</strong><small className="block truncate text-[10px] text-slate-500">{label}</small></span>
    </button>
  );
}
function StudentRow({ student: s, active, now, onClick }: { student: LiveStudent; active: boolean; now: number; onClick: () => void }) {
  const attention = needsAttention(s);
  return <button type="button" onClick={onClick} style={{ contentVisibility: "auto", containIntrinsicSize: "72px" }} className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-right transition hover:bg-slate-50 ${active ? "bg-indigo-50" : ""}`}>
    <span className="relative grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-black text-brand">{s.name.slice(0,1)}<i className={`absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-white ${s.presence?.online ? "bg-emerald-500" : "bg-slate-400"}`} /></span>
    <span className="min-w-0"><span className="flex items-center gap-2"><strong className="truncate text-sm">{s.name}</strong>{attention ? <AlertTriangle size={14} className="shrink-0 text-amber-600" /> : null}</span><small className="block truncate text-slate-500">{s.activeSession?.title || s.currentView || [s.grade,s.major].filter(Boolean).join(" • ") || "بدون فعالیت جاری"}</small></span>
    <span className="text-left"><Badge tone={stateTone(s.state)}>{stateLabel(s.state)}</Badge>{s.activeSession?.startedAt ? <small className="mt-1 block font-mono text-[10px] text-brand" dir="ltr">{elapsed(now,s.activeSession.startedAt)}</small> : null}</span>
  </button>;
}
function StudentDetail({ student: s, now, formatDateTime }: { student: LiveStudent; now: number; formatDateTime: (value?: string | Date) => string }) {
  return <div className="min-h-0 flex-1 overflow-y-auto p-3"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-indigo-50 font-black text-brand">{s.name.slice(0,1)}</span><div className="min-w-0 flex-1"><strong className="block truncate">{s.name}</strong><small className="text-slate-500">{[s.grade,s.major].filter(Boolean).join(" • ") || "بدون مشخصات تحصیلی"}</small></div><Badge tone={stateTone(s.state)}>{stateLabel(s.state)}</Badge></div>
    <div className="mt-3 rounded-lg bg-slate-50 p-3"><small className="text-slate-500">فعالیت فعلی</small><strong className="mt-1 block truncate text-sm">{s.activeSession?.title || s.currentView || (s.presence?.online ? "داخل برنامه" : "بدون فعالیت جاری")}</strong><span className="mt-1 block text-xs text-slate-500">{s.activeSession?.subject || s.presence?.deviceLabel || (s.lastActivityAt ? `آخرین حضور ${formatDateTime(s.lastActivityAt)}` : "بدون سابقه حضور")}</span>{s.activeSession?.startedAt ? <strong className="mt-2 block font-mono text-lg text-brand" dir="ltr">{elapsed(now,s.activeSession.startedAt)}</strong> : null}</div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center"><Mini label="کار باقی‌مانده" value={fa(s.remainingTasks)} /><Mini label="مرور سررسید" value={fa(s.dueReviews)} warn={s.dueReviews >= 3} /><Mini label="آخرین آزمون" value={s.lastExamPercent == null ? "—" : `${fa(s.lastExamPercent)}٪`} warn={s.lastExamPercent != null && s.lastExamPercent < 50} /></div>
    {needsAttention(s) ? <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800"><AlertTriangle size={15} />پیگیری این دانش‌آموز در اولویت است.</div> : null}
    <div className="mt-3 grid grid-cols-2 gap-2"><Link className="inline-flex h-9 items-center justify-center gap-2 rounded-md border text-sm font-semibold hover:bg-slate-50" to={`/admin/students?studentId=${encodeURIComponent(s.id)}`}><ExternalLink size={15} />پرونده</Link><Link className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white" to={`/admin/chat?studentId=${encodeURIComponent(s.id)}`}><MessageCircle size={15} />پیام</Link></div>
  </div>;
}
function CompactSkeleton() { return <div className="grid gap-px">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-[68px] animate-pulse bg-slate-50" />)}</div>; }
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white hover:bg-indigo-800"
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
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-brand">
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
