import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CalendarClock, Edit3, History, Plus, Search, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { api } from "../../shared/api/api";
import { useStudents } from "../../shared/hooks/useStudents";
import { normalizePersianText, todayIso } from "../../shared/lib/utils";
import { DatePicker } from "../../shared/ui/date-picker";
import { useLocale } from "../../shared/ui/locale";
import { useModal } from "../../shared/ui/modal";
import { notify } from "../../shared/ui/notifications";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "../../shared/ui/ui";
import { isLearningDue, learningStatusLabel, type LearningItem, type LearningResponse, type LearningReview, type LearningStatus } from "./learning-model";

type Filter = "all" | "due" | LearningStatus;
const formSchema = z.object({
  title: z.string().trim().min(2, "عنوان حداقل دو نویسه باشد.").max(2000),
  subject: z.string().trim().max(160), book: z.string().trim().max(200), chapter: z.string().trim().max(200),
  lesson: z.string().trim().max(200), topic: z.string().trim().max(240), note: z.string().trim().max(3000), hint: z.string().trim().max(3000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ مرور را انتخاب کنید."),
  mastery: z.coerce.number().min(0).max(5), status: z.enum(["pending", "done", "archived"]),
});
type FormValues = z.infer<typeof formSchema>;

export function LearningPage() {
  const students = useStudents(), params = useParams(), [searchParams, setSearchParams] = useSearchParams();
  const studentId = params.studentId || searchParams.get("studentId") || students.studentId;
  const initialFilter = parseFilter(searchParams.get("status"));
  const [search, setSearch] = useState(searchParams.get("q") || ""), [filter, setFilter] = useState<Filter>(initialFilter);
  const deferredSearch = useDeferredValue(search);
  const modal = useModal(), qc = useQueryClient(), { formatDate, formatDateTime } = useLocale();
  const learning = useQuery({ queryKey: ["student-learning", studentId], enabled: !!studentId, queryFn: () => api.get<LearningResponse>(`/admin/students/${studentId}/learning`) });
  useEffect(() => {
    if (!params.studentId && studentId && searchParams.get("studentId") !== studentId)
      updateLocation(studentId);
  }, [studentId]);
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/admin/students/${studentId}/learning/${id}`), onMutate: async (id) => { const key = ["student-learning", studentId]; await qc.cancelQueries({ queryKey: key }); const previous = qc.getQueryData<LearningResponse>(key); qc.setQueryData<LearningResponse>(key, (current) => current ? { ...current, items: current.items.filter((item) => item.id !== id), summary: { ...current.summary, totalItems: Math.max(0, current.summary.totalItems - 1) } } : current); return { previous, key }; }, onSuccess: () => notify("مورد یادگیری حذف شد."), onError: (error, _id, context) => { if (context?.previous) qc.setQueryData(context.key, context.previous); notify(error instanceof Error ? error.message : "حذف انجام نشد.", "error"); }, onSettled: () => void qc.invalidateQueries({ queryKey: ["student-learning", studentId] }) });
  const items = useMemo(() => (learning.data?.items || []).filter((item) => {
    const text = normalizePersianText([item.title, item.subject, item.book, item.chapter, item.lesson, item.topic, item.note].join(" "));
    const matchesSearch = text.includes(normalizePersianText(deferredSearch));
    const matchesFilter = filter === "all" || filter === "due" ? filter === "all" || isLearningDue(item, todayIso()) : item.status === filter;
    return matchesSearch && matchesFilter;
  }), [deferredSearch, filter, learning.data?.items]);
  const summary = learning.data?.summary;

  function updateLocation(nextStudentId: string, nextFilter = filter, nextSearch = search) {
    const next = new URLSearchParams();
    if (nextStudentId) next.set("studentId", nextStudentId);
    if (nextFilter !== "all") next.set("status", nextFilter);
    if (nextSearch.trim()) next.set("q", nextSearch.trim());
    setSearchParams(next, { replace: true });
  }
  function openEditor(item?: LearningItem) {
    modal.open({ title: item ? "ویرایش مورد یادگیری" : "افزودن مرور جدید", description: "این مورد در چرخه مرور دانش‌آموز قرار می‌گیرد و تغییرات فوراً برای او همگام می‌شود.", size: "lg", content: <LearningForm studentId={studentId} item={item} onSaved={() => { modal.close(); void qc.invalidateQueries({ queryKey: ["student-learning", studentId] }); }} /> });
  }
  async function openHistory(item: LearningItem) {
    modal.open({ title: `تاریخچه مرور: ${item.title}`, size: "md", content: <ReviewHistory studentId={studentId} itemId={item.id} formatDateTime={formatDateTime} /> });
  }
  return <div className="grid gap-4">
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-56 flex-1 md:max-w-sm"><StudentPicker students={students.students} value={studentId} onChange={(id) => updateLocation(id)} /></div>
      <Button onClick={() => openEditor()} disabled={!studentId}><Plus size={17} /> مرور جدید</Button>
    </Card>
    {!studentId ? <EmptyState title="ابتدا یک دانش‌آموز انتخاب کنید." /> : learning.isError ? <EmptyState title="دریافت سیستم یادگیری ناموفق بود." action={<Button variant="soft" onClick={() => void learning.refetch()}>تلاش دوباره</Button>} /> : <>
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Metric icon={Sparkles} label="کل موارد" value={summary?.totalItems} />
        <Metric icon={CalendarClock} label="سررسید امروز" value={summary?.dueItems} tone="red" />
        <Metric icon={BookOpenCheck} label="در انتظار" value={summary?.pendingItems} tone="amber" />
        <Metric icon={TrendingUp} label="میانگین تسلط" value={`${Number(summary?.averageMastery || 0).toLocaleString("fa-IR")} / ۵`} tone="green" />
        <Metric icon={BookOpenCheck} label="تلاش آزمون" value={summary?.attempts} />
        <Metric icon={TrendingUp} label="میانگین آزمون" value={`${Number(summary?.averageExamPercent || 0).toLocaleString("fa-IR")}٪`} />
      </section>
      <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <label className="flex h-10 items-center gap-2 rounded-md border bg-slate-50 px-3"><Search size={16} className="text-slate-400" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => { setSearch(event.target.value); updateLocation(studentId, filter, event.target.value); }} placeholder="جستجو در عنوان، درس، کتاب یا مبحث" /></label>
            <Select value={filter} onChange={(event) => { const value = event.target.value as Filter; setFilter(value); updateLocation(studentId, value); }}><option value="all">همه موارد</option><option value="due">سررسیدشده</option><option value="pending">در انتظار</option><option value="done">تکمیل‌شده</option><option value="archived">بایگانی</option></Select>
            <Badge tone={items.length ? "blue" : "neutral"}>{items.length.toLocaleString("fa-IR")} نتیجه</Badge>
          </div>
          {learning.isLoading ? <LearningSkeleton /> : items.length ? <div className="grid max-h-[calc(100dvh-22rem)] gap-2 overflow-y-auto pl-1">{items.map((item) => <LearningRow key={item.id} item={item} formatDate={formatDate} onEdit={() => openEditor(item)} onHistory={() => void openHistory(item)} onDelete={() => void modal.confirm({ title: "حذف مورد یادگیری؟", description: "این مورد و ارتباط آن با چرخه مرور حذف می‌شود.", tone: "danger", confirmLabel: "حذف" }).then((ok) => ok && remove.mutate(item.id))} />)}</div> : <EmptyState title="موردی با این جستجو و فیلتر پیدا نشد." />}
        </Card>
        <aside className="grid content-start gap-4 xl:sticky xl:top-20">
          <Card><h3 className="mb-3 font-bold">وضعیت درس‌ها</h3>{summary?.subjects?.length ? <div className="grid gap-3">{summary.subjects.map((row) => <div key={row.subject}><div className="mb-1 flex justify-between text-xs"><strong>{row.subject}</strong><span>{row.due.toLocaleString("fa-IR")} سررسید</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, row.mastery * 20)}%` }} /></div></div>)}</div> : <p className="text-sm text-slate-500">هنوز داده‌ای ثبت نشده است.</p>}</Card>
          <Card><h3 className="mb-3 font-bold">الگوهای خطا</h3>{summary?.mistakePatterns?.length ? <div className="grid gap-2">{summary.mistakePatterns.slice(0, 8).map((row, index) => <div key={`${row.subject}-${row.reason}-${index}`} className="rounded-md bg-rose-50 p-2 text-xs text-rose-800"><strong>{row.subject || "بدون درس"}</strong><p className="mt-1">{row.reason} · {row.count.toLocaleString("fa-IR")} بار</p></div>)}</div> : <p className="text-sm text-slate-500">الگوی خطایی برای نمایش وجود ندارد.</p>}</Card>
        </aside>
      </section>
    </>}
  </div>;
}

function LearningForm({ studentId, item, onSaved }: { studentId: string; item?: LearningItem; onSaved: () => void }) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { title: item?.title || "", subject: item?.subject || "", book: item?.book || "", chapter: item?.chapter || "", lesson: item?.lesson || "", topic: item?.topic || "", note: item?.note || "", hint: item?.hint || "", dueDate: item?.dueDate || todayIso(), mastery: item?.mastery || 0, status: item?.status || "pending" } });
  const save = useMutation({ mutationFn: (values: FormValues) => item ? api.patch(`/admin/students/${studentId}/learning/${item.id}`, values) : api.post(`/admin/students/${studentId}/learning`, values), onSuccess: () => { notify(item ? "مورد یادگیری به‌روز شد." : "مرور جدید ساخته شد."); void qc.invalidateQueries({ queryKey: ["student-learning", studentId] }); onSaved(); }, onError: (error) => notify(error instanceof Error ? error.message : "ذخیره انجام نشد.", "error") });
  return <form className="grid gap-3" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
    <Field label="عنوان" error={form.formState.errors.title?.message}><Input autoFocus {...form.register("title")} /></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="درس"><Input {...form.register("subject")} /></Field><Field label="مبحث"><Input {...form.register("topic")} /></Field><Field label="کتاب"><Input {...form.register("book")} /></Field><Field label="فصل"><Input {...form.register("chapter")} /></Field><Field label="درس / بخش"><Input {...form.register("lesson")} /></Field><Field label="تاریخ مرور" error={form.formState.errors.dueDate?.message}><DatePicker value={form.watch("dueDate")} onChange={(value) => form.setValue("dueDate", value, { shouldValidate: true })} /></Field></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="تسلط از ۰ تا ۵"><Input type="number" min={0} max={5} {...form.register("mastery")} /></Field><Field label="وضعیت"><Select {...form.register("status")}><option value="pending">در انتظار مرور</option><option value="done">تکمیل‌شده</option><option value="archived">بایگانی</option></Select></Field></div>
    <Field label="یادداشت"><Textarea rows={3} {...form.register("note")} /></Field><Field label="راهنمای مرور بعدی"><Textarea rows={3} {...form.register("hint")} /></Field>
    <Button type="submit" loading={save.isPending} disabled={save.isPending}>ذخیره مورد یادگیری</Button>
  </form>;
}

function ReviewHistory({ studentId, itemId, formatDateTime }: { studentId: string; itemId: string; formatDateTime: (value?: string | Date) => string }) {
  const history = useQuery({ queryKey: ["learning-history", studentId, itemId], queryFn: () => api.get<LearningReview[]>(`/admin/students/${studentId}/learning/${itemId}/reviews?limit=50`) });
  if (history.isLoading) return <LearningSkeleton />;
  if (history.isError) return <EmptyState title="تاریخچه مرور دریافت نشد." />;
  return history.data?.length ? <div className="grid gap-2">{history.data.map((row) => <article key={row.id} className="rounded-md border p-3"><div className="flex justify-between gap-2"><strong>تسلط {row.previousMastery.toLocaleString("fa-IR")} ← {row.newMastery.toLocaleString("fa-IR")}</strong><Badge tone="blue">امتیاز {row.rating.toLocaleString("fa-IR")}</Badge></div><p className="mt-1 text-xs text-slate-500">{formatDateTime(row.reviewedAt)} · فاصله بعدی {row.nextIntervalDays.toLocaleString("fa-IR")} روز</p></article>)}</div> : <EmptyState title="هنوز مروری برای این مورد ثبت نشده است." />;
}

function LearningRow({ item, formatDate, onEdit, onHistory, onDelete }: { item: LearningItem; formatDate: (value?: string | Date) => string; onEdit: () => void; onHistory: () => void; onDelete: () => void }) {
  const due = isLearningDue(item, todayIso());
  return <article className={`rounded-lg border p-3 ${due ? "border-rose-200 bg-rose-50/40" : "bg-white"}`}><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate">{item.title}</strong><Badge tone={due ? "red" : item.status === "archived" ? "neutral" : item.status === "done" ? "green" : "amber"}>{due ? "سررسیدشده" : learningStatusLabel(item.status)}</Badge></div><p className="mt-1 text-xs text-slate-500">{[item.subject, item.book, item.chapter, item.lesson, item.topic].filter(Boolean).join(" · ") || "بدون دسته‌بندی"}</p></div><div className="flex gap-1"><Button className="size-9 p-0" variant="ghost" aria-label="تاریخچه مرور" onClick={onHistory}><History size={15} /></Button><Button className="size-9 p-0" variant="ghost" aria-label="ویرایش" onClick={onEdit}><Edit3 size={15} /></Button><Button className="size-9 p-0 text-rose-700" variant="ghost" aria-label="حذف" onClick={onDelete}><Trash2 size={15} /></Button></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-slate-100 px-2 py-1">مرور بعدی: {formatDate(item.dueDate)}</span><span className="rounded bg-slate-100 px-2 py-1">تسلط {item.mastery.toLocaleString("fa-IR")}/۵</span><span className="rounded bg-slate-100 px-2 py-1">{item.reviewCount.toLocaleString("fa-IR")} مرور</span><span className="rounded bg-slate-100 px-2 py-1">فاصله {item.intervalDays.toLocaleString("fa-IR")} روز</span>{item.sourceAnswerId ? <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">متصل به پاسخ آزمون</span> : null}</div>{item.note || item.hint ? <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">یادداشت و راهنمای مرور</summary>{item.note ? <p className="mt-2">{item.note}</p> : null}{item.hint ? <p className="mt-1 text-teal-800">راهنما: {item.hint}</p> : null}</details> : null}</article>;
}
function Metric({ icon: Icon, label, value = 0, tone = "blue" }: { icon: typeof Sparkles; label: string; value?: string | number; tone?: "blue" | "red" | "amber" | "green" }) { const colors = { blue: "bg-sky-50 text-sky-700", red: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", green: "bg-emerald-50 text-emerald-700" }; return <Card className="flex items-center gap-3 p-3"><span className={`grid size-9 place-items-center rounded-full ${colors[tone]}`}><Icon size={17} /></span><div><span className="block text-[11px] text-slate-500">{label}</span><strong>{typeof value === "number" ? value.toLocaleString("fa-IR") : value}</strong></div></Card>; }
function LearningSkeleton() { return <div className="grid gap-2">{[1, 2, 3, 4].map((row) => <div key={row} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}</div>; }
function parseFilter(value: string | null): Filter { return value && ["all", "due", "pending", "done", "archived"].includes(value) ? value as Filter : "all"; }
