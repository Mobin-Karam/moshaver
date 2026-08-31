import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StudentPicker } from "../../components/StudentPicker";
import { DataTransferWorkspace } from "../../components/data-transfer";
import { DatePicker } from "../../components/date-picker";
import { useLocale } from "../../components/locale";
import { useModal } from "../../components/modal";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { addDays, fa, todayIso } from "../../lib/utils";
import { api } from "../../services/api";
import type { Exam, Plan, PlanTask } from "../../types/domain";

type Mode = "day" | "week" | "month";
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
    qc = useQueryClient();
  const [date, setDate] = useState(todayIso()),
    [mode, setMode] = useState<Mode>("week");
  const range = useMemo(() => plannerRange(date, mode), [date, mode]);
  const plans = useQuery({
    queryKey: ["plans", students.studentId, range.from, range.to],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<Plan[]>(
        `/admin/plans?studentId=${encodeURIComponent(students.studentId)}&from=${range.from}&to=${range.to}`,
      ),
  });
  const exams = useQuery({
    queryKey: ["exams", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<Exam[]>(
        `/admin/exams?studentId=${encodeURIComponent(students.studentId)}`,
      ),
  });
  const totals = summarizePlans(plans.data ?? []),
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
    onSuccess: refresh,
  });
  const removeTask = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tasks/${id}`),
    onSuccess: refresh,
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
    modal.open({
      title: task ? "ویرایش فعالیت" : "افزودن فعالیت",
      size: "lg",
      content: (
        <TaskForm
          initial={toTaskDraft(task, plan.tasks.length)}
          exams={exams.data ?? []}
          busy={saveTask.isPending}
          onCancel={modal.close}
          onSubmit={(body) =>
            void saveTask
              .mutateAsync({ planId: plan.id, task: { ...body, id: task?.id } })
              .then(modal.close)
          }
        />
      ),
    });
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
  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black">برنامه‌ریز</h2>
          <p className="text-slate-500">
            مدیریت کامل روز، هفته و ماه، فعالیت‌ها، انتشار و انتقال JSON
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px_auto]">
          <StudentPicker
            students={students.students}
            value={students.studentId}
            onChange={students.setStudentId}
          />
          <DatePicker value={date} onChange={setDate} />
          <Button onClick={() => openPlan(date)} disabled={!students.studentId}>
            <Plus size={16} />
            برنامه این روز
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(["day", "week", "month"] as Mode[]).map((item) => (
            <button
              key={item}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === item ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
              onClick={() => setMode(item)}
            >
              {{ day: "روز", week: "هفته", month: "ماه" }[item]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            onClick={() => setDate(shiftView(date, mode, -1))}
          >
            <ChevronRight size={17} />
          </Button>
          <Button variant="soft" onClick={() => setDate(todayIso())}>
            امروز
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDate(shiftView(date, mode, 1))}
          >
            <ChevronLeft size={17} />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="برنامه‌ها" value={plans.data?.length ?? 0} />
        <Metric label="فعالیت‌ها" value={totals.tasks} />
        <Metric label="دقیقه" value={totals.minutes} />
        <Metric label="تست" value={totals.tests} />
      </div>
      {warnings.length ? (
        <Card className="border-amber-200 bg-amber-50">
          <strong className="text-amber-900">هشدارهای برنامه</strong>
          <ul className="mt-2 list-inside list-disc text-sm leading-7 text-amber-800">
            {warnings.slice(0, 8).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} />
            <h3 className="font-bold">
              {range.from === range.to
                ? range.from
                : `${range.from} تا ${range.to}`}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="soft"
              disabled={!students.studentId}
              onClick={() =>
                void modal
                  .confirm({
                    title: "انتشار تمام برنامه‌های بازه؟",
                    description: `${range.from} تا ${range.to}`,
                  })
                  .then((ok) => ok && publishRange.mutate(true))
              }
            >
              انتشار بازه
            </Button>
            <Button
              variant="ghost"
              disabled={!students.studentId}
              onClick={() =>
                void modal
                  .confirm({
                    title: "تبدیل بازه به پیش‌نویس؟",
                    description: `${range.from} تا ${range.to}`,
                  })
                  .then((ok) => ok && publishRange.mutate(false))
              }
            >
              پیش‌نویس بازه
            </Button>
          </div>
        </div>
        <PlannerCanvas
          mode={mode}
          date={date}
          range={range}
          plans={plans.data ?? []}
          onSelectDay={(next) => {
            setDate(next);
            setMode("day");
          }}
          onCreate={openPlan}
          onEditPlan={openPlan}
          onAddTask={openTask}
          onEditTask={openTask}
          onDuplicate={openDuplicate}
          onDeleteTask={(task) =>
            confirmDelete(
              "حذف فعالیت؟",
              "این فعالیت از برنامه حذف می‌شود.",
              () => removeTask.mutate(task.id),
            )
          }
          onDeletePlan={(plan) =>
            confirmDelete(
              "حذف کامل برنامه روز؟",
              `برنامه ${plan.planDate} و فعالیت‌های آن حذف می‌شوند.`,
              () => removePlan.mutate(plan.id),
            )
          }
          onToggle={(plan) =>
            patchPlan.mutate({
              id: plan.id,
              body: { published: !plan.published },
            })
          }
        />
      </Card>
      <DataTransferWorkspace
        studentId={students.studentId}
        scope="all"
        title="انتقال برنامه‌ها و آزمون‌های مرتبط"
        description="فایل برنامه را بدون درگیری با متن خام JSON بررسی، رفع تداخل و ثبت کنید؛ خروجی بازه نیز تمام پیوندهای آزمون را حفظ می‌کند."
        exportFrom={range.from}
        exportTo={range.to}
        showPlanReplacement
        showExamReplacement
        onImported={() => void refresh()}
      />
    </div>
  );
}

type CanvasProps = {
  mode: Mode;
  date: string;
  range: { from: string; to: string };
  plans: Plan[];
  onSelectDay: (date: string) => void;
  onCreate: (date: string) => void;
  onEditPlan: (date: string, plan: Plan) => void;
  onAddTask: (plan: Plan) => void;
  onEditTask: (plan: Plan, task: PlanTask) => void;
  onDuplicate: (plan: Plan) => void;
  onDeleteTask: (task: PlanTask) => void;
  onDeletePlan: (plan: Plan) => void;
  onToggle: (plan: Plan) => void;
};
function PlannerCanvas(props: CanvasProps) {
  const { formatDate } = useLocale();
  const map = new Map(props.plans.map((plan) => [plan.planDate, plan]));
  if (props.mode === "day") {
    const plan = map.get(props.date);
    return plan ? (
      <DayView plan={plan} actions={props} />
    ) : (
      <EmptyState
        title={`برای ${props.date} برنامه‌ای نیست.`}
        action={
          <Button onClick={() => props.onCreate(props.date)}>
            <Plus size={16} />
            ساخت برنامه
          </Button>
        }
      />
    );
  }
  const days =
    props.mode === "week"
      ? dateRange(props.range.from, props.range.to)
      : monthCells(props.range.from, props.range.to);
  return (
    <div
      className={
        props.mode === "week"
          ? "grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          : "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
      }
    >
      {days.map((day, index) =>
        day ? (
          <button
            key={day}
            onClick={() => props.onSelectDay(day)}
            className={`min-h-32 rounded-lg border p-3 text-right transition hover:border-brand ${day === todayIso() ? "border-brand bg-teal-50" : "border-slate-200"}`}
          >
            <span className="text-xs text-slate-500">
              {formatDate(day, {
                month: "short",
                day: "numeric",
                year: undefined,
              })}
            </span>
            {map.get(day) ? (
              <>
                <strong className="mt-2 block">
                  {map.get(day)?.title || "برنامه روزانه"}
                </strong>
                <Badge tone={map.get(day)?.published ? "green" : "amber"}>
                  {map.get(day)?.published ? "منتشر" : "پیش‌نویس"}
                </Badge>
                <small className="mt-2 block text-slate-500">
                  {fa(map.get(day)?.tasks.length ?? 0)} فعالیت
                </small>
              </>
            ) : (
              <span className="mt-6 block text-center text-2xl text-slate-300">
                +
              </span>
            )}
          </button>
        ) : (
          <div key={`empty-${index}`} />
        ),
      )}
    </div>
  );
}
function DayView({ plan, actions }: { plan: Plan; actions: CanvasProps }) {
  const { formatDate } = useLocale();
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg bg-slate-50 p-4">
        <Badge tone={plan.published ? "green" : "amber"}>
          {plan.published ? "منتشر" : "پیش‌نویس"}
        </Badge>
        <h3 className="mt-3 text-lg font-black">
          {plan.title || "برنامه روزانه"}
        </h3>
        <p className="text-sm text-slate-500">
          {plan.persianDate || formatDate(plan.planDate, { weekday: "long" })}{" "}
          {plan.dayLabel ? `• ${plan.dayLabel}` : ""}
        </p>
        {plan.motivationText ? (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            {plan.motivationText}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2">
          <Button onClick={() => actions.onAddTask(plan)}>
            <Plus size={16} />
            فعالیت
          </Button>
          <Button
            variant="soft"
            onClick={() => actions.onEditPlan(plan.planDate, plan)}
          >
            <Pencil size={16} />
            مشخصات روز
          </Button>
          <Button variant="soft" onClick={() => actions.onDuplicate(plan)}>
            <Copy size={16} />
            کپی روز
          </Button>
          <Button variant="ghost" onClick={() => actions.onToggle(plan)}>
            {plan.published ? "بردن به پیش‌نویس" : "انتشار"}
          </Button>
          <Button variant="danger" onClick={() => actions.onDeletePlan(plan)}>
            <Trash2 size={16} />
            حذف برنامه
          </Button>
        </div>
      </aside>
      <section className="grid content-start gap-2">
        {plan.tasks.length ? (
          plan.tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[100px_1fr_auto]"
            >
              <span className="font-mono text-xs text-slate-500">
                {task.start} — {task.end}
              </span>
              <div>
                <strong>
                  {task.subject ? `${task.subject} — ` : ""}
                  {task.title || task.type}
                </strong>
                <small className="block text-slate-500">
                  {[
                    task.pages && `صفحه ${task.pages}`,
                    task.testCount && `${task.testCount} تست`,
                    task.examId && "آزمون متصل",
                    task.note,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </small>
              </div>
              <div className="flex gap-1">
                <Button
                  className="h-8 px-2"
                  variant="ghost"
                  onClick={() => actions.onEditTask(plan, task)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  className="h-8 px-2"
                  variant="ghost"
                  onClick={() => actions.onDeleteTask(task)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="هنوز فعالیتی ثبت نشده است." />
        )}
      </section>
    </div>
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
  busy,
  onSubmit,
  onCancel,
}: {
  initial: TaskDraft;
  exams: Exam[];
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
  return {
    from: `${date.slice(0, 7)}-01`,
    to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)),
  };
}
function shiftView(date: string, mode: Mode, direction: number) {
  const d = new Date(`${date}T12:00:00`);
  if (mode === "month") d.setMonth(d.getMonth() + direction);
  else d.setDate(d.getDate() + direction * (mode === "week" ? 7 : 1));
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
