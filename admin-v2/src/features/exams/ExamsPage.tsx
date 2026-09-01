import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import { DataTransferWorkspace } from "../../shared/ui/data-transfer";
import { DatePicker, DateTimePicker } from "../../shared/ui/date-picker";
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
import { api } from "../../shared/api/api";
import type { Exam } from "../../shared/types/domain";
import { notify } from "../../shared/ui/notifications";
import { ExamAttempts } from "./ExamAttempts";
import {
  examDraftError,
  examReadiness,
  makeExamDraft,
  matchesExam,
  type ExamDraft,
} from "./exam-model";

type RetryRequest = {
  id: string;
  examTitle?: string;
  reason?: string;
  message?: string;
  createdAt?: string;
  created_at?: string;
  status?: "pending" | "approved" | "rejected";
  advisor_note?: string;
};

export function ExamsPage() {
  const students = useStudents(),
    modal = useModal(),
    qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const studentParam = params.get("studentId") || "";
  const searchParam = params.get("search") || "";
  const statusParam = params.get("status") || "all";
  const visibilityParam = params.get("visibility") || "all";
  const [search, setSearch] = useState(params.get("search") || ""),
    [status, setStatus] = useState(params.get("status") || "all"),
    [visibility, setVisibility] = useState(params.get("visibility") || "all"),
    [selected, setSelected] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(search);
  useEffect(() => {
    if (studentParam && studentParam !== students.studentId)
      students.setStudentId(studentParam);
  }, [studentParam, students.studentId, students.setStudentId]);
  useEffect(() => {
    setSearch(searchParam);
    setStatus(statusParam);
    setVisibility(visibilityParam);
  }, [searchParam, statusParam, visibilityParam]);
  useEffect(() => {
    if (!students.studentId) return;
    setParams(
      (current) => {
        current.set("studentId", students.studentId);
        search ? current.set("search", search) : current.delete("search");
        status !== "all"
          ? current.set("status", status)
          : current.delete("status");
        visibility !== "all"
          ? current.set("visibility", visibility)
          : current.delete("visibility");
        return current;
      },
      { replace: true },
    );
  }, [students.studentId, search, status, visibility]);
  useEffect(() => setSelected([]), [students.studentId]);
  const exams = useQuery({
    queryKey: ["exams", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<Exam[]>(
        `/admin/exams?studentId=${encodeURIComponent(students.studentId)}`,
      ),
  });
  const retries = useQuery({
    queryKey: ["exam-retry", students.studentId],
    enabled: !!students.studentId,
    queryFn: () =>
      api.get<RetryRequest[]>(
        `/admin/exam-attempt-requests?studentId=${encodeURIComponent(students.studentId)}`,
      ),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["exams"] });
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ExamDraft }) =>
      id
        ? api.patch(`/admin/exams/${id}`, body)
        : api.post("/admin/exams", { ...body, studentId: students.studentId }),
    onSuccess: (_, variables) => {
      notify(variables.id ? "آزمون ویرایش شد." : "آزمون ساخته شد.");
      void refresh();
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "ذخیره آزمون ناموفق بود.",
        "error",
      ),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/exams/${id}`),
    onSuccess: () => {
      notify("آزمون حذف شد.");
      void refresh();
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "حذف آزمون ناموفق بود.",
        "error",
      ),
  });
  const review = useMutation({
    mutationFn: ({
      id,
      status,
      advisorNote,
    }: {
      id: string;
      status: "approved" | "rejected";
      advisorNote: string;
    }) =>
      api.patch(`/admin/exam-attempt-requests/${id}`, { status, advisorNote }),
    onSuccess: (_, variables) => {
      notify(
        variables.status === "approved"
          ? "تلاش مجدد فعال شد."
          : "درخواست رد شد.",
      );
      void qc.invalidateQueries({ queryKey: ["exam-retry"] });
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "ثبت تصمیم ناموفق بود.",
        "error",
      ),
  });
  const addSyllabus = useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: SyllabusDraft }) =>
      api.post(`/admin/exams/${examId}/syllabus`, data),
    onSuccess: () => {
      notify("بودجه‌بندی افزوده شد.");
      void refresh();
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "افزودن بودجه ناموفق بود.",
        "error",
      ),
  });
  const deleteSyllabus = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/syllabus/${id}`),
    onSuccess: () => {
      notify("بودجه‌بندی حذف شد.");
      void refresh();
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : "حذف بودجه ناموفق بود.",
        "error",
      ),
  });
  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api.patch(`/admin/exams/${id}`, { published }),
    onMutate: async ({ id, published }) => {
      await qc.cancelQueries({ queryKey: ["exams", students.studentId] });
      const previous = qc.getQueryData<Exam[]>(["exams", students.studentId]);
      qc.setQueryData<Exam[]>(["exams", students.studentId], (items) =>
        items?.map((item) => (item.id === id ? { ...item, published } : item)),
      );
      return { previous };
    },
    onError: (error, _, context) => {
      if (context?.previous)
        qc.setQueryData(["exams", students.studentId], context.previous);
      notify(
        error instanceof Error ? error.message : "تغییر انتشار ناموفق بود.",
        "error",
      );
    },
    onSuccess: (_, variables) =>
      notify(
        variables.published ? "آزمون منتشر شد." : "آزمون به پیش‌نویس برگشت.",
      ),
    onSettled: () => void refresh(),
  });
  const filtered = useMemo(
    () =>
      (exams.data ?? []).filter((exam) =>
        matchesExam(exam, deferredSearch, status, visibility),
      ),
    [exams.data, deferredSearch, status, visibility],
  );
  const pendingRetries = (retries.data ?? []).filter(
    (request) => !request.status || request.status === "pending",
  );

  function openEditor(exam?: Exam) {
    modal.open({
      title: exam ? "ویرایش آزمون" : "آزمون جدید",
      size: "lg",
      content: (
        <ExamForm
          initial={makeExamDraft(exam)}
          onCancel={modal.close}
          onSubmit={async (body) => {
            await save.mutateAsync({ id: exam?.id, body });
            modal.close();
          }}
        />
      ),
    });
  }
  function openRetryReview(
    request: RetryRequest,
    status: "approved" | "rejected",
  ) {
    modal.open({
      title: status === "approved" ? "تأیید تلاش مجدد" : "رد درخواست تلاش مجدد",
      description: request.examTitle || "آزمون",
      content: (
        <RetryReviewForm
          status={status}
          initialNote={request.advisor_note || ""}
          onCancel={modal.close}
          onSubmit={async (advisorNote) => {
            await review.mutateAsync({ id: request.id, status, advisorNote });
            modal.close();
          }}
        />
      ),
    });
  }
  function confirmRemove(exam: Exam) {
    void modal
      .confirm({
        title: "حذف آزمون؟",
        description: `«${exam.title}» و داده‌های وابسته حذف می‌شوند.`,
        tone: "danger",
        confirmLabel: "حذف",
      })
      .then((ok) => ok && remove.mutate(exam.id));
  }
  async function bulk(action: "publish" | "draft" | "delete") {
    const blocked =
      action === "publish"
        ? selected.filter(
            (id) =>
              !(exams.data || []).find((exam) => exam.id === id)?.delivery
                ?.questionCount,
          )
        : [];
    const ids = selected.filter((id) => !blocked.includes(id));
    if (blocked.length)
      notify(`${blocked.length} آزمون بدون سؤال منتشر نشد.`, "warning");
    if (!ids.length) return;
    const ok = await modal.confirm({
      title:
        action === "delete"
          ? `حذف ${ids.length} آزمون؟`
          : `تغییر وضعیت ${ids.length} آزمون؟`,
      tone: action === "delete" ? "danger" : "default",
      confirmLabel: action === "delete" ? "حذف همه" : "اعمال",
    });
    if (!ok) return;
    const results = await Promise.allSettled(
      ids.map((id) =>
        action === "delete"
          ? api.delete(`/admin/exams/${id}`)
          : api.patch(`/admin/exams/${id}`, {
              published: action === "publish",
            }),
      ),
    );
    const failed = ids.filter(
      (_, index) => results[index]?.status === "rejected",
    );
    setSelected(failed);
    failed.length
      ? notify(
          `${failed.length} عملیات ناموفق ماند؛ موارد مربوطه همچنان انتخاب هستند.`,
          "warning",
        )
      : notify("عملیات گروهی انجام شد.");
    void refresh();
  }

  return (
    <div className="grid gap-5">
      <header className="flex justify-end">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex md:w-auto">
          <div className="col-span-2 min-w-0 flex-1 sm:min-w-60">
            <StudentPicker
              students={students.students}
              value={students.studentId}
              onChange={students.setStudentId}
            />
          </div>
          <Button disabled={!students.studentId} onClick={() => openEditor()}>
            <Plus size={16} />
            آزمون
          </Button>
          <Button
            variant="soft"
            disabled={!students.studentId}
            onClick={() =>
              modal.open({
                title: "سابقه و پاسخ‌های آزمون",
                size: "xl",
                content: <ExamAttempts studentId={students.studentId} />,
              })
            }
          >
            <History size={16} /> سابقه
          </Button>
          <Button
            variant="soft"
            disabled={!students.studentId}
            onClick={() =>
              modal.open({
                title: "ورود و خروج داده آزمون‌ها",
                size: "xl",
                content: (
                  <DataTransferWorkspace
                    studentId={students.studentId}
                    scope="exams"
                    title="انتقال کامل آزمون‌ها"
                    description="آزمون‌ها را همراه سؤال، پاسخ، توضیح، بودجه‌بندی، زمان‌بندی و محدودیت تلاش بررسی و منتقل کنید."
                    showExamReplacement
                    onImported={() => void refresh()}
                  />
                ),
              })
            }
          >
            <MoreHorizontal size={16} /> بیشتر
          </Button>
        </div>
      </header>
      {pendingRetries.length ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <details open>
            <summary className="cursor-pointer font-bold">
              {pendingRetries.length} درخواست تلاش مجدد در انتظار بررسی
            </summary>
            <div className="grid gap-2">
              {pendingRetries.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <strong>{request.examTitle || "آزمون"}</strong>
                    <p className="text-xs text-slate-500">
                      {request.reason || request.message || "بدون توضیح"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openRetryReview(request, "approved")}
                    >
                      <Check size={15} />
                      تأیید
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => openRetryReview(request, "rejected")}
                    >
                      <X size={15} />
                      رد
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </Card>
      ) : null}
      <Card className="sticky top-16 z-10 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
          <Input
            type="search"
            placeholder="جست‌وجوی نام یا تاریخ…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="upcoming">آینده</option>
            <option value="active">فعال</option>
            <option value="completed">تمام‌شده</option>
            <option value="cancelled">لغوشده</option>
          </Select>
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="all">منتشر و پیش‌نویس</option>
            <option value="published">منتشر</option>
            <option value="draft">پیش‌نویس</option>
          </Select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="blue">{exams.data?.length || 0} کل</Badge>
          <Badge tone="green">
            {(exams.data || []).filter((exam) => exam.published).length} منتشر
          </Badge>
          <Badge tone="red">
            {
              (exams.data || []).filter(
                (exam) => exam.published && !exam.delivery?.questionCount,
              ).length
            }{" "}
            بدون سؤال
          </Badge>
          {pendingRetries.length ? (
            <Badge tone="amber">{pendingRetries.length} درخواست</Badge>
          ) : null}
          {search || status !== "all" || visibility !== "all" ? (
            <Button
              className="h-7 px-2 text-xs"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setVisibility("all");
              }}
            >
              <RotateCcw size={13} /> پاک‌کردن فیلترها
            </Button>
          ) : null}
        </div>
        {selected.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2 text-sm">
            <strong>{selected.length} انتخاب</strong>
            <Button
              className="h-8"
              variant="soft"
              onClick={() => void bulk("publish")}
            >
              انتشار
            </Button>
            <Button
              className="h-8"
              variant="soft"
              onClick={() => void bulk("draft")}
            >
              پیش‌نویس
            </Button>
            <Button
              className="h-8"
              variant="danger"
              onClick={() => void bulk("delete")}
            >
              حذف
            </Button>
          </div>
        ) : null}
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={
                !!filtered.length &&
                filtered.every((exam) => selected.includes(exam.id))
              }
              onChange={(e) =>
                setSelected(
                  e.target.checked ? filtered.map((exam) => exam.id) : [],
                )
              }
            />{" "}
            انتخاب همه نتایج
          </label>
          <Badge tone="blue">{filtered.length} آزمون</Badge>
        </div>
        {exams.isLoading ? (
          <div
            className="grid gap-3 lg:grid-cols-2"
            aria-label="در حال دریافت آزمون‌ها"
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : exams.isError ? (
          <EmptyState
            title="دریافت آزمون‌ها ناموفق بود؛ اتصال را بررسی و دوباره تلاش کنید."
            action={
              <Button variant="soft" onClick={() => void exams.refetch()}>
                تلاش دوباره
              </Button>
            }
          />
        ) : filtered.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                checked={selected.includes(exam.id)}
                onCheck={(checked) =>
                  setSelected((items) =>
                    checked
                      ? [...new Set([...items, exam.id])]
                      : items.filter((id) => id !== exam.id),
                  )
                }
                onEdit={() => openEditor(exam)}
                onDelete={() => confirmRemove(exam)}
                onToggle={() =>
                  !exam.published && !exam.delivery?.questionCount
                    ? notify(
                        "برای انتشار، ابتدا حداقل یک سؤال به آزمون اضافه کنید.",
                        "warning",
                      )
                    : togglePublish.mutate({
                        id: exam.id,
                        published: !exam.published,
                      })
                }
                toggleBusy={
                  togglePublish.isPending &&
                  togglePublish.variables?.id === exam.id
                }
                onAddSyllabus={() =>
                  modal.open({
                    title: "افزودن بودجه‌بندی",
                    description: exam.title,
                    content: (
                      <SyllabusForm
                        onCancel={modal.close}
                        onSubmit={async (data) => {
                          await addSyllabus.mutateAsync({
                            examId: exam.id,
                            data,
                          });
                          modal.close();
                        }}
                      />
                    ),
                  })
                }
                onDeleteSyllabus={(id) =>
                  void modal
                    .confirm({ title: "حذف بودجه‌بندی؟", tone: "danger" })
                    .then((ok) => ok && deleteSyllabus.mutate(id))
                }
                studentId={students.studentId}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="آزمونی با این فیلتر پیدا نشد." />
        )}
      </Card>
    </div>
  );
}

function ExamCard({
  exam,
  checked,
  onCheck,
  onEdit,
  onDelete,
  onToggle,
  toggleBusy,
  onAddSyllabus,
  onDeleteSyllabus,
  studentId,
}: {
  exam: Exam;
  checked: boolean;
  onCheck: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggleBusy: boolean;
  onAddSyllabus: () => void;
  onDeleteSyllabus: (id: string) => void;
  studentId: string;
}) {
  const { formatDate, formatDateTime } = useLocale();
  const readiness = examReadiness(exam);
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
        />
        <div className="min-w-0 flex-1">
          <strong className="block truncate">{exam.title}</strong>
          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock size={14} />
            {exam.persianDate || formatDate(exam.isoDate)}
          </span>
        </div>
        <Badge tone={readiness.tone}>{readiness.label}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Metric label="وضعیت" value={statusLabel(exam.status)} />
        <Metric label="دقیقه" value={exam.durationMinutes || 120} />
        <Metric label="سؤال" value={exam.delivery?.questionCount || 0} />
        <Metric label="تلاش" value={exam.maxAttempts || 1} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {formatDateTime(exam.openAt)} → {formatDateTime(exam.closeAt)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-8 px-2 text-xs" variant="soft" onClick={onEdit}>
          <Pencil size={14} />
          ویرایش
        </Button>
        <Link
          to={`/admin/questions?examId=${encodeURIComponent(exam.id)}&studentId=${encodeURIComponent(studentId)}`}
        >
          <Button className="h-8 px-2 text-xs" variant="soft">
            سؤال‌ها
          </Button>
        </Link>
        <Button
          className="h-8 px-2 text-xs"
          variant="ghost"
          loading={toggleBusy}
          onClick={onToggle}
        >
          {exam.published ? "پیش‌نویس" : "انتشار"}
        </Button>
        <Button className="h-8 px-2" variant="danger" onClick={onDelete}>
          <Trash2 size={14} />
        </Button>
      </div>
      {exam.published && !exam.delivery?.questionCount ? (
        <p className="mt-3 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
          این آزمون منتشر شده اما هیچ سؤالی ندارد؛ برای دانش‌آموز آماده نیست.
        </p>
      ) : null}
      <details className="mt-3 border-t pt-3">
        <summary className="flex cursor-pointer list-none justify-between">
          <strong className="text-xs">
            بودجه‌بندی ({exam.syllabus?.length || 0})
          </strong>
          <button
            type="button"
            className="text-xs text-brand"
            onClick={(event) => {
              event.preventDefault();
              onAddSyllabus();
            }}
          >
            + افزودن
          </button>
        </summary>
        <div className="mt-2">
          {exam.syllabus?.map((item) => (
            <div
              key={item.id}
              className="mb-1 flex justify-between rounded bg-slate-50 p-2 text-xs"
            >
              <span>
                <strong>{item.subject}</strong>: {item.description}
                {item.track ? ` • ${item.track}` : ""}
              </span>
              <button
                className="text-rose-700"
                onClick={() => onDeleteSyllabus(item.id)}
              >
                حذف
              </button>
            </div>
          ))}
          {!exam.syllabus?.length ? (
            <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">
              بودجه‌بندی ثبت نشده است.
            </p>
          ) : null}
        </div>
      </details>
    </article>
  );
}
function ExamForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: ExamDraft;
  onSubmit: (data: ExamDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const error = examDraftError(data);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (error) return;
        setSubmitting(true);
        void onSubmit({
          ...data,
          title: data.title.trim(),
          note: data.note.trim(),
          instructions: data.instructions.trim(),
        }).finally(() => setSubmitting(false));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="عنوان">
          <Input
            required
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </Field>
        <Field label="تاریخ فارسی">
          <Input
            required
            value={data.persianDate}
            onChange={(e) => setData({ ...data, persianDate: e.target.value })}
          />
        </Field>
        <Field label="تاریخ ISO">
          <DatePicker
            required
            value={data.isoDate}
            onChange={(isoDate) =>
              setData({
                ...data,
                isoDate,
                persianDate: persianDateForIso(isoDate),
                openAt: replaceIsoDay(data.openAt, isoDate),
                closeAt: replaceIsoDay(data.closeAt, isoDate),
              })
            }
          />
        </Field>
        <Field label="وضعیت">
          <Select
            value={data.status}
            onChange={(e) =>
              setData({
                ...data,
                status: e.target.value as ExamDraft["status"],
              })
            }
          >
            <option value="upcoming">آینده</option>
            <option value="active">فعال</option>
            <option value="completed">تمام‌شده</option>
            <option value="cancelled">لغوشده</option>
          </Select>
        </Field>
        <Field label="شروع">
          <DateTimePicker
            value={data.openAt}
            onChange={(openAt) => setData({ ...data, openAt })}
          />
        </Field>
        <Field label="پایان">
          <DateTimePicker
            value={data.closeAt}
            onChange={(closeAt) => setData({ ...data, closeAt })}
          />
        </Field>
        <Field label="مدت (دقیقه)">
          <Input
            min={1}
            max={600}
            type="number"
            value={data.durationMinutes}
            onChange={(e) =>
              setData({ ...data, durationMinutes: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="حداکثر تلاش">
          <Input
            min={1}
            max={100}
            type="number"
            value={data.maxAttempts}
            onChange={(e) =>
              setData({ ...data, maxAttempts: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="انتشار">
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
      <Field label="یادداشت داخلی">
        <Textarea
          value={data.note}
          onChange={(e) => setData({ ...data, note: e.target.value })}
        />
      </Field>
      <Field label="دستورالعمل دانش‌آموز">
        <Textarea
          rows={3}
          value={data.instructions}
          onChange={(e) => setData({ ...data, instructions: e.target.value })}
        />
      </Field>
      {submitted && error ? (
        <p
          role="alert"
          className="rounded-md bg-rose-50 p-2 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" onClick={onCancel}>
          انصراف
        </Button>
        <Button loading={submitting}>ذخیره آزمون</Button>
      </div>
    </form>
  );
}
type SyllabusDraft = {
  subject: string;
  description: string;
  track: string;
  required: boolean;
};
function SyllabusForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: SyllabusDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState<SyllabusDraft>({
    subject: "",
    description: "",
    track: "",
    required: true,
  });
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!data.subject.trim() || !data.description.trim()) return;
        setSubmitting(true);
        void onSubmit({
          ...data,
          subject: data.subject.trim(),
          description: data.description.trim(),
          track: data.track.trim(),
        }).finally(() => setSubmitting(false));
      }}
    >
      <Field label="درس">
        <Input
          required
          autoFocus
          value={data.subject}
          onChange={(e) => setData({ ...data, subject: e.target.value })}
        />
      </Field>
      <Field label="مسیر">
        <Input
          value={data.track}
          onChange={(e) => setData({ ...data, track: e.target.value })}
        />
      </Field>
      <Field label="توضیح">
        <Textarea
          required
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </Field>
      <label className="text-sm">
        <input
          type="checkbox"
          checked={data.required}
          onChange={(e) => setData({ ...data, required: e.target.checked })}
        />{" "}
        الزامی
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" onClick={onCancel}>
          انصراف
        </Button>
        <Button loading={submitting}>افزودن</Button>
      </div>
    </form>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <span className="block text-slate-500">{label}</span>
      <strong className="block truncate">{value}</strong>
    </div>
  );
}
function RetryReviewForm({
  status,
  initialNote,
  onSubmit,
  onCancel,
}: {
  status: "approved" | "rejected";
  initialNote: string;
  onSubmit: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [submitting, setSubmitting] = useState(false);
  const invalid = status === "rejected" && !note.trim();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        setSubmitting(true);
        void onSubmit(note.trim()).finally(() => setSubmitting(false));
      }}
    >
      <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        {status === "approved"
          ? "با تأیید، دانش‌آموز می‌تواند یک تلاش تازه برای این آزمون آغاز کند."
          : "دلیل رد برای ثبت سابقه و اطلاع‌رسانی روشن لازم است."}
      </p>
      <Field
        label={
          status === "approved" ? "یادداشت مشاور (اختیاری)" : "دلیل رد درخواست"
        }
        error={invalid ? "برای رد درخواست، دلیل را وارد کنید." : undefined}
      >
        <Textarea
          autoFocus
          rows={4}
          maxLength={1200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <small className="text-left text-slate-400">
        {note.length.toLocaleString("fa-IR")} / ۱۲۰۰
      </small>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" onClick={onCancel}>
          انصراف
        </Button>
        <Button
          variant={status === "rejected" ? "danger" : "primary"}
          disabled={invalid}
          loading={submitting}
        >
          {status === "approved" ? "تأیید تلاش" : "رد درخواست"}
        </Button>
      </div>
    </form>
  );
}
function persianDateForIso(isoDate: string) {
  if (!isoDate) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${isoDate}T12:00:00`));
}
function replaceIsoDay(value: string, isoDate: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.replace(/^\d{4}-\d{2}-\d{2}/, isoDate)
    : value;
}
function statusLabel(status?: Exam["status"]) {
  return (
    {
      upcoming: "آینده",
      active: "فعال",
      completed: "تمام",
      cancelled: "لغو",
    } as const
  )[status || "upcoming"];
}
