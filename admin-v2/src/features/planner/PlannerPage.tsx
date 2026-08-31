import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Command,
  Copy,
  Filter,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import { DataTransferWorkspace } from "../../shared/ui/data-transfer";
import { DatePicker } from "../../shared/ui/date-picker";
import { useLocale } from "../../shared/ui/locale";
import { useModal } from "../../shared/ui/modal";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../shared/ui/ui";
import { useStudents } from "../../shared/hooks/useStudents";
import { addDays, fa, normalizePersianText, todayIso } from "../../shared/lib/utils";
import { api } from "../../shared/api/api";
import type { Exam, Plan, PlanTask } from "../../shared/types/domain";

type Mode = "day" | "week" | "month" | "list";
type TaskFilter = "all" | "published" | "draft" | "incomplete";
type PlanDraft = Pick<
  Plan,
  | "planDate"
  | "title"
  | "dayLabel"
  | "persianDate"
  | "jalaliId"
  | "motivationText"
  | "published"
>;
type TaskDraft = {
  start: string;
  end: string;
  type: string;
  subject: string;
  title: string;
  pages: string;
  testCount: number;
  note: string;
  examId: string;
  sortOrder: number;
};

export function PlannerPage() {
  const students = useStudents(),
    modal = useModal(),
    qc = useQueryClient(),
    [params, setParams] = useSearchParams();
  const initialMode = parseMode(params.get("view"));
  const [date, setDateState] = useState(params.get("date") || todayIso()),
    [mode, setModeState] = useState<Mode>(initialMode),
    [search, setSearch] = useState(params.get("q") || ""),
    [filter, setFilter] = useState<TaskFilter>(
      parseFilter(params.get("filter")),
    ),
    [filtersOpen, setFiltersOpen] = useState(false),
    [summaryOpen, setSummaryOpen] = useState(true),
    [warningsOpen, setWarningsOpen] = useState(true),
    [moreOpen, setMoreOpen] = useState(false),
    [paletteOpen, setPaletteOpen] = useState(false),
    [drawer, setDrawer] = useState<{ plan: Plan; task?: PlanTask } | null>(
      null,
    );
  const deferredSearch = useDebouncedValue(search, 220);
  function syncUrl(next: {
    date?: string;
    mode?: Mode;
    filter?: TaskFilter;
    search?: string;
  }) {
    const copy = new URLSearchParams(params);
    const nextDate = next.date ?? date,
      nextMode = next.mode ?? mode,
      nextFilter = next.filter ?? filter,
      nextSearch = next.search ?? search;
    copy.set("date", nextDate);
    copy.set("view", nextMode);
    nextFilter === "all"
      ? copy.delete("filter")
      : copy.set("filter", nextFilter);
    nextSearch ? copy.set("q", nextSearch) : copy.delete("q");
    setParams(copy, { replace: true });
  }
  const setDate = (next: string) => {
    setDateState(next);
    syncUrl({ date: next });
  };
  const setMode = (next: Mode) => {
    setModeState(next);
    syncUrl({ mode: next });
  };
  const setTaskFilter = (next: TaskFilter) => {
    setFilter(next);
    syncUrl({ filter: next });
  };
  const range = useMemo(() => plannerRange(date, mode), [date, mode]);
  const plansKey = [
    "plans",
    students.studentId,
    range.from,
    range.to,
    deferredSearch,
    filter,
  ];
  const plansUrl = `/admin/plans?studentId=${encodeURIComponent(students.studentId)}&from=${range.from}&to=${range.to}&search=${encodeURIComponent(normalizePersianText(deferredSearch))}&status=${filter}`;
  const plans = useQuery({
    queryKey: plansKey,
    enabled: !!students.studentId,
    queryFn: () => api.get<Plan[]>(plansUrl),
  });
  useEffect(() => {
    if (!students.studentId) return;
    [-1, 1].forEach((direction) => {
      const adjacentDate = shiftView(date, mode, direction),
        adjacent = plannerRange(adjacentDate, mode);
      void qc.prefetchQuery({
        queryKey: [
          "plans",
          students.studentId,
          adjacent.from,
          adjacent.to,
          deferredSearch,
          filter,
        ],
        queryFn: () =>
          api.get<Plan[]>(
            `/admin/plans?studentId=${encodeURIComponent(students.studentId)}&from=${adjacent.from}&to=${adjacent.to}&search=${encodeURIComponent(normalizePersianText(deferredSearch))}&status=${filter}`,
          ),
        staleTime: 60_000,
      });
    });
  }, [date, deferredSearch, filter, mode, qc, students.studentId]);
  const exams = useQuery({
    queryKey: ["exams", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<Exam[]>(
        `/admin/exams?studentId=${encodeURIComponent(students.studentId)}`,
      ),
  });
  const visiblePlans = useMemo(
    () => filterPlans(plans.data ?? [], deferredSearch, filter),
    [deferredSearch, filter, plans.data],
  );
  const totals = summarizePlans(visiblePlans),
    warnings = planWarnings(plans.data ?? []),
    refresh = () => qc.invalidateQueries({ queryKey: ["plans"] });
  const savePlan = useMutation({
    mutationFn: (body: PlanDraft) =>
      api.post<Plan>("/admin/plans", {
        ...body,
        studentId: students.studentId,
      }),
    onSuccess: refresh,
  });
  const patchPlan = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PlanDraft> }) =>
      api.patch<Plan>(`/admin/plans/${id}`, body),
    onSuccess: refresh,
  });
  const removePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/plans/${id}`),
    onSuccess: refresh,
  });
  const duplicatePlan = useMutation({
    mutationFn: ({ id, planDate }: { id: string; planDate: string }) =>
      api.post(`/admin/plans/${id}/duplicate`, { planDate }),
    onSuccess: refresh,
  });
  const saveTask = useMutation({
    mutationFn: ({
      planId,
      task,
    }: {
      planId: string;
      task: TaskDraft & { id?: string };
    }) =>
      task.id
        ? api.patch(`/admin/tasks/${task.id}`, task)
        : api.post(`/admin/plans/${planId}/tasks`, task),
    onMutate: async ({ planId, task }) => {
      const key = plansKey;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Plan[]>(key);
      qc.setQueryData<Plan[]>(key, (current) =>
        current?.map((plan) =>
          plan.id !== planId
            ? plan
            : {
                ...plan,
                tasks: task.id
                  ? plan.tasks.map((item) =>
                      item.id === task.id ? { ...item, ...task } : item,
                    )
                  : [
                      ...plan.tasks,
                      { ...task, id: `optimistic-${Date.now()}` } as PlanTask,
                    ],
              },
        ),
      );
      return { previous, key };
    },
    onSuccess: (updated) => {
      if (updated && typeof updated === "object" && "id" in updated)
        qc.setQueryData<Plan[]>(plansKey, (current) =>
          replacePlan(current, updated as Plan),
        );
      else refresh();
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
    },
    onSettled: refresh,
  });
  const removeTask = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tasks/${id}`),
    onMutate: async (id) => {
      const key = plansKey;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Plan[]>(key);
      qc.setQueryData<Plan[]>(key, (current) =>
        current?.map((p) => ({
          ...p,
          tasks: p.tasks.filter((t) => t.id !== id),
        })),
      );
      return { previous, key };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
    },
    onSettled: refresh,
  });
  const moveTask = useMutation({
    mutationFn: ({
      taskId,
      planId,
      start,
      end,
    }: {
      taskId: string;
      planId: string;
      start: string;
      end: string;
    }) => api.patch<Plan>(`/admin/tasks/${taskId}`, { planId, start, end }),
    onMutate: async (move) => {
      const key = plansKey;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Plan[]>(key);
      qc.setQueryData<Plan[]>(key, (current) =>
        optimisticMove(current || [], move),
      );
      return { previous, key };
    },
    onError: (_error, _move, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
    },
    onSettled: refresh,
    meta: { successMessage: "زمان فعالیت جابه‌جا شد." },
  });
  const publishRange = useMutation({
    mutationFn: (published: boolean) =>
      api.post("/admin/plans/publish-range", {
        studentId: students.studentId,
        ...range,
        published,
      }),
    onSuccess: refresh,
  });

  function openPlan(planDate: string, plan?: Plan) {
    modal.open({
      title: plan ? "ویرایش مشخصات روز" : "ساخت برنامه روز",
      size: "lg",
      content: (
        <PlanForm
          initial={toPlanDraft(planDate, plan)}
          busy={savePlan.isPending || patchPlan.isPending}
          onCancel={modal.close}
          onSubmit={(body) =>
            void (
              plan
                ? patchPlan.mutateAsync({ id: plan.id, body })
                : savePlan.mutateAsync(body)
            ).then(modal.close)
          }
        />
      ),
    });
  }
  function openTask(plan: Plan, task?: PlanTask) {
    setDrawer({ plan, task });
  }
  function openDuplicate(plan: Plan) {
    modal.open({
      title: "کپی برنامه به روز دیگر",
      content: (
        <DateAction
          initial={addDays(plan.planDate, 1)}
          onCancel={modal.close}
          onSubmit={(planDate) =>
            void duplicatePlan
              .mutateAsync({ id: plan.id, planDate })
              .then(() => {
                setDate(planDate);
                modal.close();
              })
          }
        />
      ),
    });
  }
  function confirmDelete(
    title: string,
    description: string,
    action: () => void,
  ) {
    void modal
      .confirm({ title, description, tone: "danger", confirmLabel: "حذف" })
      .then((ok) => ok && action());
  }
  async function ensurePlan(planDate: string) {
    const existing = plans.data?.find((plan) => plan.planDate === planDate);
    if (existing) return existing;
    return savePlan.mutateAsync(toPlanDraft(planDate));
  }
  async function quickAdd(planDate: string, start = "08:00") {
    const plan = await ensurePlan(planDate);
    setDrawer({
      plan,
      task: {
        id: "",
        start,
        end: addMinutes(start, 60),
        type: "study",
        title: "",
        subject: "",
        pages: "",
        testCount: 0,
        note: "",
        sortOrder: plan.tasks.length + 1,
      } as PlanTask,
    });
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input,textarea,select,[contenteditable=true]"))
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void quickAdd(date);
      } else if (event.key.toLowerCase() === "t") setDate(todayIso());
      else if (event.key === "ArrowRight") setDate(shiftView(date, mode, -1));
      else if (event.key === "ArrowLeft") setDate(shiftView(date, mode, 1));
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  return (
    <div className="grid gap-3">
      <header className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44 shrink-0">
            <StudentPicker
              students={students.students}
              value={students.studentId}
              onChange={students.setStudentId}
            />
          </div>
          <div className="flex items-center rounded-lg bg-slate-100 p-1">
            <Button
              className="h-8 px-2"
              variant="ghost"
              aria-label="بازه قبل"
              onClick={() => setDate(shiftView(date, mode, -1))}
            >
              <ChevronRight size={16} />
            </Button>
            <DatePicker
              className="h-8 w-36 border-0 bg-transparent"
              value={date}
              onChange={setDate}
            />
            <Button
              className="h-8 px-2"
              variant="ghost"
              aria-label="بازه بعد"
              onClick={() => setDate(shiftView(date, mode, 1))}
            >
              <ChevronLeft size={16} />
            </Button>
          </div>
          <Button
            className="h-9 px-3"
            variant="soft"
            onClick={() => setDate(todayIso())}
          >
            امروز
          </Button>
          <ViewSwitch value={mode} onChange={setMode} />
          <label className="flex h-9 min-w-44 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
            <Search size={15} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                syncUrl({ search: e.target.value });
              }}
              placeholder="جستجوی فعالیت…"
            />
            <kbd className="hidden rounded bg-white px-1 text-[10px] text-slate-400 lg:inline">
              ⌘K
            </kbd>
          </label>
          <div className="relative">
            <Button
              className="h-9 px-3"
              variant="soft"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Filter size={15} />
              فیلتر{filter !== "all" ? <Badge tone="blue">۱</Badge> : null}
            </Button>
            {filtersOpen ? (
              <FilterMenu
                value={filter}
                onChange={(value) => {
                  setTaskFilter(value);
                  setFiltersOpen(false);
                }}
              />
            ) : null}
          </div>
          <Button
            className="h-9"
            disabled={!students.studentId}
            onClick={() => void quickAdd(date)}
          >
            <Plus size={16} />
            فعالیت جدید
          </Button>
          <div className="relative">
            <Button
              className="h-9 px-3"
              variant="ghost"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <MoreHorizontal size={18} />
            </Button>
            {moreOpen ? (
              <MoreMenu
                onClose={() => setMoreOpen(false)}
                onPlan={() => {
                  setMoreOpen(false);
                  openPlan(date);
                }}
                onPublish={(published) => {
                  setMoreOpen(false);
                  void modal
                    .confirm({
                      title: published
                        ? "انتشار برنامه‌های بازه؟"
                        : "پیش‌نویس کردن بازه؟",
                      description: `${range.from} تا ${range.to}`,
                    })
                    .then((ok) => ok && publishRange.mutate(published));
                }}
                onTransfer={() => {
                  setMoreOpen(false);
                  modal.open({
                    title: "ورود و خروج JSON",
                    size: "xl",
                    content: (
                      <DataTransferWorkspace
                        studentId={students.studentId}
                        scope="all"
                        title="انتقال برنامه‌ها و آزمون‌های مرتبط"
                        description="ورود، اعتبارسنجی و خروجی استاندارد بازه"
                        exportFrom={range.from}
                        exportTo={range.to}
                        showPlanReplacement
                        showExamReplacement
                        onImported={() => void refresh()}
                      />
                    ),
                  });
                }}
              />
            ) : null}
          </div>
        </div>
        {filter !== "all" ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-400">فیلتر فعال:</span>
            <button
              className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs text-brand"
              onClick={() => setTaskFilter("all")}
            >
              {filterLabel(filter)}
              <X size={12} />
            </button>
          </div>
        ) : null}
      </header>
      <section className="flex min-h-10 flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <button
          className="flex items-center gap-2 text-xs font-bold"
          onClick={() => setSummaryOpen((v) => !v)}
        >
          <ChevronsUpDown size={14} />
          خلاصه بازه
        </button>
        {summaryOpen ? (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <SummaryItem label="روز" value={visiblePlans.length} />
            <SummaryItem label="فعالیت" value={totals.tasks} />
            <SummaryItem
              label="ساعت"
              value={Math.round((totals.minutes / 60) * 10) / 10}
            />
            <SummaryItem label="تست" value={totals.tests} />
          </div>
        ) : null}
        {warnings.length && warningsOpen ? (
          <button
            className="mr-auto flex max-w-full items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800"
            onClick={() => setWarningsOpen(false)}
            title="بستن"
          >
            <AlertTriangle size={14} />
            <span className="truncate">{warnings[0]}</span>
            {warnings.length > 1 ? (
              <Badge tone="amber">+{fa(warnings.length - 1)}</Badge>
            ) : null}
            <X size={12} />
          </button>
        ) : null}
      </section>
      <Card className="h-[calc(100vh-235px)] min-h-[480px] overflow-hidden p-0">
        <PlannerCanvas
          mode={mode}
          date={date}
          range={range}
          plans={visiblePlans}
          loading={plans.isLoading}
          onSelectDay={(next) => {
            setDate(next);
            setMode("day");
          }}
          onCreate={openPlan}
          onQuickAdd={(day, start) => void quickAdd(day, start)}
          onEditTask={openTask}
          onMoveTask={(taskId, planId, start, end) =>
            moveTask.mutate({ taskId, planId, start, end })
          }
        />
      </Card>
      {drawer ? (
        <TaskDrawer
          title={drawer.task?.id ? "ویرایش فعالیت" : "فعالیت جدید"}
          onClose={() => setDrawer(null)}
          onDelete={
            drawer.task?.id
              ? () =>
                  confirmDelete(
                    "حذف فعالیت؟",
                    "این فعالیت از برنامه حذف می‌شود.",
                    () => {
                      removeTask.mutate(drawer.task!.id);
                      setDrawer(null);
                    },
                  )
              : undefined
          }
        >
          <TaskForm
            initial={toTaskDraft(
              drawer.task?.id ? drawer.task : undefined,
              drawer.plan.tasks.length,
            )}
            exams={exams.data ?? []}
            studentId={students.studentId}
            busy={saveTask.isPending}
            onCancel={() => setDrawer(null)}
            onSubmit={(body) =>
              void saveTask
                .mutateAsync({
                  planId: drawer.plan.id,
                  task: { ...body, id: drawer.task?.id || undefined },
                })
                .then(() => setDrawer(null))
            }
          />
        </TaskDrawer>
      ) : null}
      {paletteOpen ? (
        <CommandPalette
          plans={plans.data ?? []}
          onClose={() => setPaletteOpen(false)}
          onDate={(next) => {
            setDate(next);
            setPaletteOpen(false);
          }}
          onView={(next) => {
            setMode(next);
            setPaletteOpen(false);
          }}
          onTask={(plan, task) => {
            setDrawer({ plan, task });
            setPaletteOpen(false);
          }}
          onCreate={() => {
            void quickAdd(date);
            setPaletteOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

type CanvasProps = {
  mode: Mode;
  date: string;
  range: { from: string; to: string };
  plans: Plan[];
  loading: boolean;
  onSelectDay: (date: string) => void;
  onCreate: (date: string) => void;
  onQuickAdd: (date: string, start?: string) => void;
  onEditTask: (plan: Plan, task: PlanTask) => void;
  onMoveTask: (
    taskId: string,
    planId: string,
    start: string,
    end: string,
  ) => void;
};
function PlannerCanvas(props: CanvasProps) {
  const { formatDate } = useLocale();
  const map = new Map(props.plans.map((plan) => [plan.planDate, plan]));
  if (props.loading) return <PlannerSkeleton />;
  if (props.mode === "list")
    return <VirtualList plans={props.plans} onEdit={props.onEditTask} />;
  if (props.mode === "month")
    return (
      <div className="h-full overflow-auto overscroll-contain">
        <div className="grid min-h-full grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4 xl:grid-cols-7">
          {monthCells(props.range.from, props.range.to).map((day, index) =>
            day ? (
              <button
                key={day}
                className={`min-h-24 bg-white p-2 text-right hover:bg-teal-50 ${day === todayIso() ? "ring-2 ring-inset ring-brand" : ""}`}
                onClick={() => props.onSelectDay(day)}
              >
                <strong className="text-xs">
                  {formatDate(day, {
                    day: "numeric",
                    month: "short",
                    year: undefined,
                  })}
                </strong>
                <span className="mt-2 block text-xs text-slate-500">
                  {fa(map.get(day)?.tasks.length || 0)} فعالیت
                </span>
                {map
                  .get(day)
                  ?.tasks.slice(0, 2)
                  .map((t) => (
                    <small
                      key={t.id}
                      className="mt-1 block truncate rounded bg-slate-100 px-1"
                    >
                      {t.start} {t.title || t.subject}
                    </small>
                  ))}
              </button>
            ) : (
              <div key={`empty-${index}`} className="bg-slate-50" />
            ),
          )}
        </div>
      </div>
    );
  const days =
    props.mode === "day"
      ? [props.date]
      : dateRange(props.range.from, props.range.to);
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain">
      <div
        className={
          props.mode === "day"
            ? "grid min-h-full grid-cols-1"
            : "grid min-h-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        }
      >
        {days.map((day) => (
          <DayColumn
            key={day}
            day={day}
            plan={map.get(day)}
            compact={props.mode === "week"}
            formatDate={formatDate}
            actions={props}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  plan,
  formatDate,
  actions,
}: {
  day: string;
  plan?: Plan;
  compact: boolean;
  formatDate: (
    value?: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  actions: CanvasProps;
}) {
  function drop(event: React.DragEvent, targetStart?: string) {
    event.preventDefault();
    event.stopPropagation();
    const raw = event.dataTransfer.getData("application/x-moshaver-task");
    if (!raw) return;
    const data = JSON.parse(raw) as { id: string; start: string; end: string };
    if (plan) {
      const duration = Math.max(15, minutesBetween(data.start, data.end));
      const start = targetStart || data.start;
      actions.onMoveTask(data.id, plan.id, start, addMinutes(start, duration));
    }
  }
  return (
    <section
      onDragOver={(e) => e.preventDefault()}
      onDrop={(event) => drop(event)}
      className="min-w-0 border-l border-slate-200 bg-slate-50/40 xl:min-h-full"
    >
      <header
        className={`sticky top-0 z-10 border-b border-slate-200 px-2 py-2 ${day === todayIso() ? "bg-teal-50" : "bg-white"}`}
      >
        <button
          className="w-full text-right"
          onClick={() => actions.onSelectDay(day)}
        >
          <strong className="block text-xs">
            {formatDate(day, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: undefined,
            })}
          </strong>
          <span className="text-[10px] text-slate-400">
            {fa(plan?.tasks.length || 0)} فعالیت
          </span>
        </button>
      </header>
      <div className="grid content-start gap-1.5 p-2">
        {plan?.tasks.length ? (
          plan.tasks.map((task) => (
            <CompactTask
              key={task.id}
              task={task}
              plan={plan}
              onEdit={actions.onEditTask}
            />
          ))
        ) : (
          <button
            className="rounded-lg border border-dashed border-slate-200 py-5 text-xs text-slate-400 hover:border-brand hover:text-brand"
            onClick={() =>
              plan ? actions.onQuickAdd(day) : actions.onCreate(day)
            }
          >
            + برنامه این روز
          </button>
        )}
        <div className="sticky bottom-2 mt-1 grid grid-cols-3 gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {["08:00", "14:00", "19:00"].map((start) => (
            <button
              key={start}
              className="flex h-8 items-center justify-center gap-1 rounded-md text-[10px] font-semibold text-brand hover:bg-teal-50"
              onClick={() => actions.onQuickAdd(day, start)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => drop(event, start)}
              title={`افزودن یا انتقال به ساعت ${start}`}
            >
              <Plus size={11} />
              <span dir="ltr">{start}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
function CompactTask({
  task,
  plan,
  onEdit,
}: {
  task: PlanTask;
  plan: Plan;
  onEdit: (plan: Plan, task: PlanTask) => void;
}) {
  const status = task.completedAt ? "انجام‌شده" : "برنامه‌ریزی";
  return (
    <button
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData(
          "application/x-moshaver-task",
          JSON.stringify({ id: task.id, start: task.start, end: task.end }),
        )
      }
      onClick={() => onEdit(plan, task)}
      className="group min-w-0 rounded-md border border-slate-200 bg-white p-1.5 text-right shadow-sm transition hover:border-brand hover:shadow"
    >
      <div className="flex min-w-0 items-center gap-1">
        <span className="font-mono text-[10px] text-slate-400" dir="ltr">
          {task.start}
        </span>
        <Badge
          tone={
            task.type === "exam"
              ? "red"
              : task.type === "test"
                ? "amber"
                : "neutral"
          }
        >
          {task.type === "exam"
            ? "بالا"
            : task.type === "test"
              ? "متوسط"
              : "عادی"}
        </Badge>
      </div>
      <strong className="mt-0.5 block truncate text-[11px]">
        {task.title || task.subject || task.type}
      </strong>
      <small className="mt-0.5 block truncate text-[9px] text-slate-400">
        {status}
      </small>
      <div className="grid max-h-0 overflow-hidden text-[10px] text-slate-500 opacity-0 transition-all group-hover:mt-1 group-hover:max-h-12 group-hover:opacity-100">
        {task.subject} {task.note}
      </div>
    </button>
  );
}
function VirtualList({
  plans,
  onEdit,
}: {
  plans: Plan[];
  onEdit: (plan: Plan, task: PlanTask) => void;
}) {
  const tasks = plans.flatMap((plan) =>
    plan.tasks.map((task) => ({ plan, task })),
  );
  const [start, setStart] = useState(0);
  const row = 58,
    visible = 14;
  return (
    <div
      className="h-full overflow-auto"
      onScroll={(e) => setStart(Math.floor(e.currentTarget.scrollTop / row))}
    >
      <div style={{ height: tasks.length * row, position: "relative" }}>
        {tasks
          .slice(start, start + visible + 4)
          .map(({ plan, task }, index) => (
            <button
              key={task.id}
              onClick={() => onEdit(plan, task)}
              className="absolute right-0 grid w-full grid-cols-[110px_90px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 text-right hover:bg-slate-50"
              style={{ height: row, top: (start + index) * row }}
            >
              <span className="text-xs text-slate-500">{plan.planDate}</span>
              <span className="font-mono text-xs" dir="ltr">
                {task.start}–{task.end}
              </span>
              <strong className="truncate text-sm">
                {task.subject ? `${task.subject} — ` : ""}
                {task.title || task.type}
              </strong>
              <Badge>{task.type}</Badge>
            </button>
          ))}
      </div>
    </div>
  );
}
function PlannerSkeleton() {
  return (
    <div className="grid h-full grid-cols-7 gap-px bg-slate-200">
      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
        <div key={day} className="bg-white p-2">
          <div className="h-8 animate-pulse rounded bg-slate-100" />
          {[1, 2, 3].map((x) => (
            <div
              key={x}
              className="mt-2 h-16 animate-pulse rounded bg-slate-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
function ViewSwitch({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {(["day", "week", "month", "list"] as Mode[]).map((mode) => (
        <button
          key={mode}
          className={`h-7 rounded-md px-2 text-xs font-semibold ${value === mode ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
          onClick={() => onChange(mode)}
        >
          {{ day: "روز", week: "هفته", month: "ماه", list: "فهرست" }[mode]}
        </button>
      ))}
    </div>
  );
}
function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <b className="text-sm text-ink">{fa(value)}</b>{" "}
      <span className="text-slate-400">{label}</span>
    </span>
  );
}
function FilterMenu({
  value,
  onChange,
}: {
  value: TaskFilter;
  onChange: (value: TaskFilter) => void;
}) {
  return (
    <div className="absolute left-0 top-11 z-40 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
      <strong className="block px-2 py-1 text-xs">وضعیت برنامه</strong>
      {(["all", "published", "draft", "incomplete"] as TaskFilter[]).map(
        (item) => (
          <button
            key={item}
            className={`mt-1 block w-full rounded-md px-3 py-2 text-right text-sm ${value === item ? "bg-teal-50 text-brand" : "hover:bg-slate-50"}`}
            onClick={() => onChange(item)}
          >
            {filterLabel(item)}
          </button>
        ),
      )}
    </div>
  );
}
function MoreMenu({
  onClose,
  onPlan,
  onPublish,
  onTransfer,
}: {
  onClose: () => void;
  onPlan: () => void;
  onPublish: (value: boolean) => void;
  onTransfer: () => void;
}) {
  return (
    <div className="absolute left-0 top-11 z-40 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
      <button
        className="block w-full rounded-md px-3 py-2 text-right text-sm hover:bg-slate-50"
        onClick={onPlan}
      >
        تنظیمات برنامه روز
      </button>
      <button
        className="block w-full rounded-md px-3 py-2 text-right text-sm hover:bg-slate-50"
        onClick={() => onPublish(true)}
      >
        انتشار بازه
      </button>
      <button
        className="block w-full rounded-md px-3 py-2 text-right text-sm hover:bg-slate-50"
        onClick={() => onPublish(false)}
      >
        پیش‌نویس کردن بازه
      </button>
      <button
        className="block w-full rounded-md px-3 py-2 text-right text-sm hover:bg-slate-50"
        onClick={onTransfer}
      >
        ورود / خروج JSON
      </button>
      <button
        className="mt-1 block w-full border-t px-3 py-2 text-right text-xs text-slate-400"
        onClick={onClose}
      >
        بستن
      </button>
    </div>
  );
}
function TaskDrawer({
  title,
  onClose,
  onDelete,
  children,
}: {
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-auto rounded-t-2xl bg-white p-5 shadow-2xl md:bottom-0 md:right-auto md:top-0 md:w-[460px] md:rounded-none"
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-brand">جزئیات فعالیت</span>
            <h3 className="text-lg font-black">{title}</h3>
          </div>
          <div className="flex gap-1">
            {onDelete ? (
              <Button className="h-9 px-2" variant="ghost" onClick={onDelete}>
                <Trash2 size={17} className="text-rose-600" />
              </Button>
            ) : null}
            <Button className="h-9 px-2" variant="ghost" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        </header>
        {children}
      </aside>
    </div>
  );
}
function CommandPalette({
  plans,
  onClose,
  onDate,
  onView,
  onTask,
  onCreate,
}: {
  plans: Plan[];
  onClose: () => void;
  onDate: (date: string) => void;
  onView: (mode: Mode) => void;
  onTask: (plan: Plan, task: PlanTask) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const tasks = plans
    .flatMap((plan) => plan.tasks.map((task) => ({ plan, task })))
    .filter((x) =>
      [x.task.title, x.task.subject, x.plan.planDate].join(" ").includes(query),
    )
    .slice(0, 12);
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-start bg-slate-950/55 px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="فرمان‌های برنامه‌ریز"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <label className="flex h-14 items-center gap-3 border-b px-4">
          <Command size={20} className="text-brand" />
          <input
            ref={input}
            className="min-w-0 flex-1 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی فعالیت، تاریخ یا فرمان…"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <kbd className="text-xs text-slate-400">Esc</kbd>
        </label>
        <div className="max-h-[55vh] overflow-auto p-2">
          <div className="grid grid-cols-2 gap-2">
            <PaletteButton icon={Plus} label="فعالیت جدید" onClick={onCreate} />
            <PaletteButton
              icon={Calendar}
              label="رفتن به امروز"
              onClick={() => onDate(todayIso())}
            />
            {(["day", "week", "month", "list"] as Mode[]).map((mode) => (
              <PaletteButton
                key={mode}
                icon={CalendarDays}
                label={`نمای ${{ day: "روز", week: "هفته", month: "ماه", list: "فهرست" }[mode]}`}
                onClick={() => onView(mode)}
              />
            ))}
          </div>
          {query ? (
            <>
              <h4 className="px-2 pb-1 pt-4 text-xs text-slate-400">نتایج</h4>
              {tasks.map(({ plan, task }) => (
                <button
                  key={task.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right hover:bg-slate-50"
                  onClick={() => onTask(plan, task)}
                >
                  <span className="font-mono text-xs text-slate-400">
                    {task.start}
                  </span>
                  <strong className="truncate text-sm">
                    {task.title || task.subject || task.type}
                  </strong>
                  <small className="mr-auto text-slate-400">
                    {plan.planDate}
                  </small>
                </button>
              ))}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
function PaletteButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:border-brand hover:bg-teal-50"
      onClick={onClick}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function PlanForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: PlanDraft;
  busy: boolean;
  onSubmit: (data: PlanDraft) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState(initial);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="تاریخ ISO">
          <DatePicker
            required
            value={data.planDate}
            onChange={(planDate) => setData({ ...data, planDate })}
          />
        </Field>
        <Field label="عنوان">
          <Input
            value={data.title || ""}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </Field>
        <Field label="عنوان روز">
          <Input
            value={data.dayLabel || ""}
            onChange={(e) => setData({ ...data, dayLabel: e.target.value })}
          />
        </Field>
        <Field label="تاریخ فارسی">
          <Input
            value={data.persianDate || ""}
            onChange={(e) => setData({ ...data, persianDate: e.target.value })}
          />
        </Field>
        <Field label="شناسه شمسی">
          <Input
            value={data.jalaliId || ""}
            onChange={(e) => setData({ ...data, jalaliId: e.target.value })}
          />
        </Field>
        <Field label="وضعیت">
          <Select
            value={data.published ? "1" : "0"}
            onChange={(e) =>
              setData({ ...data, published: e.target.value === "1" })
            }
          >
            <option value="0">پیش‌نویس</option>
            <option value="1">منتشر</option>
          </Select>
        </Field>
      </div>
      <Field label="پیام انگیزشی">
        <Textarea
          maxLength={600}
          rows={3}
          value={data.motivationText || ""}
          onChange={(e) => setData({ ...data, motivationText: e.target.value })}
        />
      </Field>
      <Actions busy={busy} onCancel={onCancel} />
    </form>
  );
}
function TaskForm({
  initial,
  exams,
  studentId,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: TaskDraft;
  exams: Exam[];
  studentId: string;
  busy: boolean;
  onSubmit: (data: TaskDraft) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState(initial);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="شروع">
          <Input
            required
            type="time"
            value={data.start}
            onChange={(e) => setData({ ...data, start: e.target.value })}
          />
        </Field>
        <Field label="پایان">
          <Input
            required
            type="time"
            value={data.end}
            onChange={(e) => setData({ ...data, end: e.target.value })}
          />
        </Field>
        <Field label="نوع">
          <Select
            value={data.type}
            onChange={(e) =>
              setData({
                ...data,
                type: e.target.value,
                examId: e.target.value === "exam" ? data.examId : "",
              })
            }
          >
            {[
              "study",
              "review",
              "test",
              "class",
              "prayer",
              "meal",
              "break",
              "exam",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="درس">
          <Input
            value={data.subject}
            onChange={(e) => setData({ ...data, subject: e.target.value })}
          />
        </Field>
        <Field label="عنوان">
          <Input
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </Field>
        <Field label="صفحات">
          <Input
            value={data.pages}
            onChange={(e) => setData({ ...data, pages: e.target.value })}
          />
        </Field>
        <Field label="تعداد تست">
          <Input
            min={0}
            type="number"
            value={data.testCount}
            onChange={(e) =>
              setData({ ...data, testCount: Number(e.target.value) })
            }
          />
        </Field>
        {data.type === "exam" ? (
          <div className="grid gap-1">
          <Field label="آزمون مرتبط">
            <Select
              value={data.examId}
              onChange={(e) => setData({ ...data, examId: e.target.value })}
            >
              <option value="">بدون آزمون</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.persianDate || exam.isoDate} — {exam.title}
                </option>
              ))}
            </Select>
          </Field>
          {data.examId ? <Link className="text-xs font-bold text-brand hover:underline" to={`/admin/questions?examId=${encodeURIComponent(data.examId)}&studentId=${encodeURIComponent(studentId)}`}>بازکردن بانک سؤال این آزمون</Link> : null}
          </div>
        ) : null}
      </div>
      <Field label="یادداشت">
        <Textarea
          rows={3}
          value={data.note}
          onChange={(e) => setData({ ...data, note: e.target.value })}
        />
      </Field>
      <Actions busy={busy} onCancel={onCancel} />
    </form>
  );
}
function DateAction({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (date: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initial);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(date);
      }}
    >
      <Field label="تاریخ مقصد">
        <DatePicker required value={date} onChange={setDate} />
      </Field>
      <Actions busy={false} onCancel={onCancel} />
    </form>
  );
}
function Actions({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="soft" onClick={onCancel}>
        انصراف
      </Button>
      <Button loading={busy}>ذخیره</Button>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="mt-1 block text-xl">{fa(value)}</strong>
    </Card>
  );
}
function toPlanDraft(date: string, plan?: Plan): PlanDraft {
  return {
    planDate: date,
    title: plan?.title || "",
    dayLabel: plan?.dayLabel || "",
    persianDate: plan?.persianDate || "",
    jalaliId: plan?.jalaliId || "",
    motivationText: plan?.motivationText || "",
    published: plan?.published ?? false,
  };
}
function toTaskDraft(task?: PlanTask, count = 0): TaskDraft {
  return {
    start: task?.start || "08:00",
    end: task?.end || "09:00",
    type: task?.type || "study",
    subject: task?.subject || "",
    title: task?.title || "",
    pages: task?.pages || "",
    testCount: task?.testCount || 0,
    note: task?.note || "",
    examId: task?.examId || "",
    sortOrder: task?.sortOrder || count + 1,
  };
}
export function plannerRange(date: string, mode: Mode) {
  if (mode === "day") return { from: date, to: date };
  const d = new Date(`${date}T12:00:00`);
  if (mode === "week") {
    const offset = (d.getDay() + 1) % 7,
      from = iso(addDateDays(d, -offset));
    return { from, to: addDays(from, 6) };
  }
  if (mode === "month")
    return {
      from: `${date.slice(0, 7)}-01`,
      to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)),
    };
  return { from: addDays(date, -30), to: addDays(date, 30) };
}
function shiftView(date: string, mode: Mode, direction: number) {
  const d = new Date(`${date}T12:00:00`);
  if (mode === "month") d.setMonth(d.getMonth() + direction);
  else
    d.setDate(
      d.getDate() +
        direction * (mode === "week" ? 7 : mode === "list" ? 30 : 1),
    );
  return iso(d);
}
function addDateDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}
function dateRange(from: string, to: string) {
  const out: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) out.push(day);
  return out;
}
function monthCells(from: string, to: string) {
  const offset = (new Date(`${from}T12:00:00`).getDay() + 1) % 7;
  return [...Array<string | null>(offset).fill(null), ...dateRange(from, to)];
}
function taskMinutes(task: PlanTask) {
  const [sh, sm] = (task.start || "00:00").split(":").map(Number),
    [eh, em] = (task.end || "00:00").split(":").map(Number);
  return Math.max(0, eh * 60 + em - sh * 60 - sm);
}
function summarizePlans(plans: Plan[]) {
  return plans.reduce(
    (acc, plan) => {
      plan.tasks.forEach((task) => {
        acc.tasks++;
        acc.minutes += taskMinutes(task);
        acc.tests += Number(task.testCount || 0);
      });
      return acc;
    },
    { tasks: 0, minutes: 0, tests: 0 },
  );
}
export function planWarnings(plans: Plan[]) {
  const warnings: string[] = [];
  plans.forEach((plan) => {
    let total = 0;
    plan.tasks.forEach((task, index) => {
      total += taskMinutes(task);
      if ((task.end || "") > "22:30")
        warnings.push(`${plan.planDate}: فعالیت دیرهنگام تا ${task.end}`);
      plan.tasks.slice(index + 1).forEach((other) => {
        if (
          (task.start || "") < (other.end || "") &&
          (other.start || "") < (task.end || "")
        )
          warnings.push(
            `${plan.planDate}: تداخل ${task.start} و ${other.start}`,
          );
      });
    });
    if (total > 480)
      warnings.push(`${plan.planDate}: حجم برنامه بیش از ۸ ساعت است`);
  });
  return warnings;
}
function parseMode(value: string | null): Mode {
  return value === "day" || value === "month" || value === "list"
    ? value
    : "week";
}
function parseFilter(value: string | null): TaskFilter {
  return value === "published" || value === "draft" || value === "incomplete"
    ? value
    : "all";
}
function filterLabel(value: TaskFilter) {
  return (
    {
      all: "همه برنامه‌ها",
      published: "فقط منتشرشده",
      draft: "فقط پیش‌نویس",
      incomplete: "فعالیت‌های انجام‌نشده",
    } as const
  )[value];
}
export function filterPlans(plans: Plan[], search: string, filter: TaskFilter) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  return plans
    .filter(
      (plan) =>
        filter === "all" ||
        (filter === "published" && plan.published) ||
        (filter === "draft" && !plan.published) ||
        (filter === "incomplete" &&
          plan.tasks.some((task) => !task.completedAt)),
    )
    .map((plan) => ({
      ...plan,
      tasks: needle
        ? plan.tasks.filter((task) =>
            normalizePersianText(
              [task.title, task.subject, task.note, task.type]
                .filter(Boolean)
                .join(" "),
            )
              .toLocaleLowerCase("fa")
              .includes(needle),
          )
        : plan.tasks,
    }))
    .filter((plan) => !needle || plan.tasks.length > 0);
}
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}
function replacePlan(current: Plan[] | undefined, updated: Plan) {
  if (!current) return [updated];
  const found = current.some((plan) => plan.id === updated.id);
  return found
    ? current.map((plan) => (plan.id === updated.id ? updated : plan))
    : [...current, updated].sort((a, b) =>
        a.planDate.localeCompare(b.planDate),
      );
}
export function optimisticMove(
  plans: Plan[],
  move: { taskId: string; planId: string; start: string; end: string },
) {
  let moved: PlanTask | undefined;
  const stripped = plans.map((plan) => ({
    ...plan,
    tasks: plan.tasks.filter((task) => {
      if (task.id === move.taskId) {
        moved = { ...task, start: move.start, end: move.end };
        return false;
      }
      return true;
    }),
  }));
  if (!moved) return plans;
  return stripped.map((plan) =>
    plan.id === move.planId
      ? {
          ...plan,
          tasks: [...plan.tasks, moved!].sort((a, b) =>
            (a.start || "").localeCompare(b.start || ""),
          ),
        }
      : plan,
  );
}
function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number),
    total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function minutesBetween(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}
