import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, FileJson, Plus, Send, Trash2 } from "lucide-react";
import { StudentPicker } from "../../components/StudentPicker";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import { addDays, fa, todayIso } from "../../lib/utils";
import type { Plan, PlanTask } from "../../types/domain";
import { useModal } from "../../components/modal";

type DraftTask = {
  type: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  duration: number;
  testCount: number;
  note: string;
};

const emptyTask = (): DraftTask => ({
  type: "STUDY",
  title: "",
  subject: "",
  startTime: "08:00",
  endTime: "09:00",
  duration: 60,
  testCount: 0,
  note: "",
});

export function PlannerPage() {
  const students = useStudents();
  const modal = useModal();
  const [date, setDate] = useState(todayIso());
  const [json, setJson] = useState("");
  const [replacePlans, setReplacePlans] = useState(false);
  const [replaceExams, setReplaceExams] = useState(false);
  const [tasks, setTasks] = useState<DraftTask[]>([emptyTask()]);
  const qc = useQueryClient();
  const from = date;
  const to = addDays(date, 6);
  const plans = useQuery({ queryKey: ["plans", students.studentId, from, to], enabled: !!students.studentId, queryFn: () => api.get<Plan[]>(`/admin/plans?studentId=${students.studentId}&from=${from}&to=${to}`) });
  const totals = useMemo(() => summarizePlans(plans.data ?? []), [plans.data]);

  const saveDay = useMutation({
    mutationFn: (publish: boolean) =>
      api.post<Plan>("/admin/plans", {
        studentId: students.studentId,
        date,
        publish,
        tasks: tasks.filter((task) => task.title.trim()).map((task, index) => ({ ...task, priority: index, duration: Number(task.duration || minutes(task.startTime, task.endTime)), testCount: Number(task.testCount || 0) })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
  const preview = useMutation({ mutationFn: () => api.post<Record<string, unknown>>("/admin/import/preview", { studentId: students.studentId, data: JSON.parse(json) }) });
  const commit = useMutation({ mutationFn: (publishImported: boolean) => api.post<Record<string, unknown>>("/admin/import/commit", { studentId: students.studentId, data: JSON.parse(json), publishImported, replaceExistingPlans: replacePlans, replaceExistingExams: replaceExams, sourceName: `Admin v2 ${new Date().toISOString()}` }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });
  const publishRange = useMutation({ mutationFn: (published: boolean) => api.post<{ updated: number }>("/admin/plans/publish-range", { studentId: students.studentId, from, to, published }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });
  const deleteTask = useMutation({ mutationFn: (id: string) => api.delete(`/admin/tasks/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">برنامه‌ریز</h2>
          <p className="text-slate-500">ساخت روزانه، مدیریت هفته، انتشار، JSON و کنترل حجم کار</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} />
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="برنامه‌ها" value={plans.data?.length || 0} />
        <Metric label="فعالیت‌ها" value={totals.tasks} />
        <Metric label="دقیقه" value={totals.minutes} />
        <Metric label="تست" value={totals.tests} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} />
              <h3 className="font-bold">نمای هفته</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" onClick={() => confirmRangePublish(true)} disabled={!students.studentId || publishRange.isPending}>انتشار بازه</Button>
              <Button variant="ghost" onClick={() => confirmRangePublish(false)} disabled={!students.studentId || publishRange.isPending}>پیش‌نویس بازه</Button>
            </div>
          </div>
          {plans.data?.length ? (
            <div className="grid gap-3">
              {plans.data.map((plan) => (
                <article key={plan.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{plan.persianDate || plan.planDate || plan.date}</strong>
                    <Badge tone={plan.published ? "green" : "amber"}>{plan.published ? "منتشر" : "پیش‌نویس"}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {plan.tasks?.map((task) => <TaskRow key={task.id} task={task} onDelete={() => void modal.confirm({ title: "حذف فعالیت؟", description: "این فعالیت از برنامه دانش‌آموز حذف می‌شود.", tone: "danger", confirmLabel: "حذف" }).then((confirmed) => confirmed && deleteTask.mutate(task.id))} />)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="برای این بازه برنامه‌ای ثبت نشده است." />
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-bold">ساخت برنامه روزانه</h3>
          <div className="grid gap-3">
            {tasks.map((task, index) => (
              <div key={index} className="rounded-md border border-slate-200 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <strong className="text-sm">فعالیت {fa(index + 1)}</strong>
                  <Button variant="ghost" className="h-8 px-2" onClick={() => setTasks((items) => items.filter((_, itemIndex) => itemIndex !== index))} disabled={tasks.length === 1}>
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="نوع"><Select value={task.type} onChange={(event) => updateTask(index, { type: event.target.value })}><option value="STUDY">مطالعه</option><option value="TEST">تست</option><option value="REVIEW">مرور</option><option value="EXAM">آزمون</option><option value="REST">استراحت</option></Select></Field>
                  <Field label="درس"><Input value={task.subject} onChange={(event) => updateTask(index, { subject: event.target.value })} /></Field>
                  <Field label="عنوان"><Input value={task.title} onChange={(event) => updateTask(index, { title: event.target.value })} /></Field>
                  <Field label="تعداد تست"><Input type="number" value={task.testCount} onChange={(event) => updateTask(index, { testCount: Number(event.target.value) })} /></Field>
                  <Field label="شروع"><Input type="time" value={task.startTime} onChange={(event) => updateTask(index, { startTime: event.target.value, duration: minutes(event.target.value, task.endTime) })} /></Field>
                  <Field label="پایان"><Input type="time" value={task.endTime} onChange={(event) => updateTask(index, { endTime: event.target.value, duration: minutes(task.startTime, event.target.value) })} /></Field>
                </div>
                <Field label="یادداشت"><Textarea rows={2} value={task.note} onChange={(event) => updateTask(index, { note: event.target.value })} /></Field>
              </div>
            ))}
            <Button variant="soft" onClick={() => setTasks((items) => [...items, emptyTask()])}><Plus size={16} />افزودن فعالیت</Button>
            <div className="grid gap-2 md:grid-cols-2">
              <Button onClick={() => saveDay.mutate(false)} disabled={!students.studentId || saveDay.isPending}><CheckCircle2 size={16} />ذخیره پیش‌نویس</Button>
              <Button onClick={() => saveDay.mutate(true)} disabled={!students.studentId || saveDay.isPending}><Send size={16} />ذخیره و انتشار</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <FileJson size={18} />
          <h3 className="font-bold">وارد کردن JSON</h3>
        </div>
        <div className="grid gap-3">
          <Field label="JSON"><Textarea rows={8} value={json} onChange={(event) => setJson(event.target.value)} placeholder='{"plans":[{"date":"2026-08-20","tasks":[{"type":"STUDY","subject":"ریاضی","title":"تابع","start":"08:00","end":"09:00"}]}]}' /></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => preview.mutate()} disabled={!json || preview.isPending}>اعتبارسنجی</Button>
            <Button onClick={() => confirmImport(false)} disabled={!preview.data || commit.isPending}>ثبت پیش‌نویس</Button>
            <Button onClick={() => confirmImport(true)} disabled={!preview.data || commit.isPending}>ثبت و انتشار</Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={replacePlans} onChange={(e) => setReplacePlans(e.target.checked)} /> جایگزینی امن برنامه‌های موجود</label><label><input type="checkbox" checked={replaceExams} onChange={(e) => setReplaceExams(e.target.checked)} /> جایگزینی آزمون‌های همنام/هم‌تاریخ</label></div>
          <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => void loadJson(`/admin/import/template?studentId=${encodeURIComponent(students.studentId)}`, "moshaver-template.json")}>دانلود قالب</Button><Button variant="ghost" onClick={() => void loadJson(`/admin/export/json?studentId=${encodeURIComponent(students.studentId)}&from=${from}&to=${to}`, `moshaver-export-${from}-${to}.json`)}>خروجی بازه</Button></div>
          {preview.data ? <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-left text-xs text-slate-100" dir="ltr">{JSON.stringify(preview.data, null, 2)}</pre> : null}
        </div>
      </Card>
    </div>
  );

  function updateTask(index: number, patch: Partial<DraftTask>) {
    setTasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function loadJson(path: string, filename: string) {
    const data = await api.get<Record<string, unknown>>(path);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
  }

  function confirmRangePublish(published: boolean) {
    void modal.confirm({ title: published ? "انتشار برنامه‌های بازه؟" : "تبدیل بازه به پیش‌نویس؟", description: `${from} تا ${to}`, confirmLabel: published ? "انتشار بازه" : "پیش‌نویس کن" }).then((confirmed) => confirmed && publishRange.mutate(published));
  }

  function confirmImport(publishImported: boolean) {
    const replacement = [replacePlans && "برنامه‌های موجود", replaceExams && "آزمون‌های موجود"].filter(Boolean).join(" و ");
    void modal.confirm({ title: publishImported ? "ثبت و انتشار داده‌های JSON؟" : "ثبت داده‌های JSON؟", description: replacement ? `${replacement} ممکن است جایگزین شوند.` : "داده‌های اعتبارسنجی‌شده برای دانش‌آموز ثبت می‌شوند.", tone: replacement ? "danger" : "default", confirmLabel: publishImported ? "ثبت و انتشار" : "ثبت پیش‌نویس" }).then((confirmed) => confirmed && commit.mutate(publishImported));
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="p-3"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block text-xl">{fa(value)}</strong></Card>;
}

function TaskRow({ task, onDelete }: { task: PlanTask; onDelete: () => void }) {
  const start = task.startTime || task.start || "--:--";
  const end = task.endTime || task.end || "--:--";
  return (
    <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm md:grid-cols-[90px_1fr_auto_auto] md:items-center">
      <span className="font-mono text-xs text-slate-500">{start} - {end}</span>
      <span><strong>{[task.subject, task.title].filter(Boolean).join(" - ") || "فعالیت"}</strong>{task.note ? <small className="block text-slate-500">{task.note}</small> : null}</span>
      <span className="text-xs text-slate-500">{fa(task.duration || minutes(start, end))} دقیقه | {fa(task.testCount || 0)} تست</span>
      <button className="text-xs text-rose-700" onClick={onDelete}>حذف</button>
    </div>
  );
}

function summarizePlans(plans: Plan[]) {
  return plans.reduce((acc, plan) => {
    for (const task of plan.tasks || []) {
      acc.tasks += 1;
      acc.minutes += Number(task.duration || minutes(task.startTime || task.start || "", task.endTime || task.end || ""));
      acc.tests += Number(task.testCount || 0);
    }
    return acc;
  }, { tasks: 0, minutes: 0, tests: 0 });
}

function minutes(start?: string, end?: string) {
  if (!start || !end) return 0;
  const [sh = "0", sm = "0"] = start.split(":");
  const [eh = "0", em = "0"] = end.split(":");
  return Math.max(0, Number(eh) * 60 + Number(em) - (Number(sh) * 60 + Number(sm)));
}
