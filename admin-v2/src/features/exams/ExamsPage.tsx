import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  Download,
  FileJson,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StudentPicker } from "../../components/StudentPicker";
import { DatePicker, DateTimePicker } from "../../components/date-picker";
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
import { api } from "../../services/api";
import type { Exam } from "../../types/domain";

type ExamDraft = {
  title: string;
  persianDate: string;
  isoDate: string;
  openAt: string;
  closeAt: string;
  durationMinutes: number;
  maxAttempts: number;
  status: NonNullable<Exam["status"]>;
  published: boolean;
  note: string;
  instructions: string;
};
type RetryRequest = {
  id: string;
  examTitle?: string;
  reason?: string;
  message?: string;
  createdAt?: string;
};
type ImportPreview = {
  summary?: {
    plans?: number;
    tasks?: number;
    exams?: number;
    questions?: number;
    conflicts?: number;
  };
  errors?: string[];
  warnings?: string[];
  conflicts?: string[];
};

export function ExamsPage() {
  const students = useStudents(),
    modal = useModal(),
    qc = useQueryClient();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [visibility, setVisibility] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [json, setJson] = useState(""),
    [replaceExisting, setReplaceExisting] = useState(false);
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
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/exams/${id}`),
    onSuccess: refresh,
  });
  const review = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "approved" | "rejected";
    }) => api.patch(`/admin/exam-attempt-requests/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-retry"] }),
  });
  const addSyllabus = useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: SyllabusDraft }) =>
      api.post(`/admin/exams/${examId}/syllabus`, data),
    onSuccess: refresh,
  });
  const deleteSyllabus = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/syllabus/${id}`),
    onSuccess: refresh,
  });
  const previewImport = useMutation({
    mutationFn: (data: unknown) =>
      api.post<ImportPreview>("/admin/import/preview", {
        studentId: students.studentId,
        data,
      }),
    meta: { successMessage: "فایل آزمون اعتبارسنجی شد." },
  });
  const commitImport = useMutation({
    mutationFn: ({
      data,
      publishImported,
    }: {
      data: unknown;
      publishImported: boolean;
    }) =>
      api.post("/admin/import/commit", {
        studentId: students.studentId,
        data,
        publishImported,
        replaceExistingPlans: false,
        replaceExistingExams: replaceExisting,
        sourceName: `Admin v2 exams ${new Date().toISOString()}`,
      }),
    onSuccess: () => {
      void refresh();
      setJson("");
      previewImport.reset();
    },
    meta: { successMessage: "آزمون‌های JSON با موفقیت وارد شدند." },
  });
  const filtered = useMemo(
    () =>
      (exams.data ?? []).filter(
        (exam) =>
          (!search.trim() ||
            `${exam.title} ${exam.isoDate} ${exam.persianDate || ""}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())) &&
          (status === "all" || exam.status === status) &&
          (visibility === "all" ||
            (visibility === "published") === !!exam.published),
      ),
    [exams.data, search, status, visibility],
  );

  function openEditor(exam?: Exam) {
    modal.open({
      title: exam ? "ویرایش آزمون" : "آزمون جدید",
      size: "lg",
      content: (
        <ExamForm
          initial={examDraft(exam)}
          busy={save.isPending}
          onCancel={modal.close}
          onSubmit={(body) =>
            void save.mutateAsync({ id: exam?.id, body }).then(modal.close)
          }
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
    const ids = [...selected];
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
    await Promise.all(
      ids.map((id) =>
        action === "delete"
          ? api.delete(`/admin/exams/${id}`)
          : api.patch(`/admin/exams/${id}`, {
              published: action === "publish",
            }),
      ),
    );
    setSelected([]);
    void refresh();
  }
  function parseJson(action: (data: unknown) => void) {
    try {
      const data = JSON.parse(json);
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        !Array.isArray((data as { exams?: unknown }).exams)
      )
        throw new Error("missing exams");
      action(data);
    } catch {
      modal.open({
        title: "فایل آزمون معتبر نیست",
        description: "JSON باید یک شیء schema-v2 دارای آرایه exams باشد.",
        tone: "danger",
      });
    }
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">آزمون‌ها</h2>
          <p className="text-slate-500">
            زمان‌بندی، وضعیت، انتشار، تلاش مجدد، بودجه و سؤال‌ها
          </p>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <div className="min-w-60 flex-1">
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
        </div>
      </header>
      {retries.data?.length ? (
        <Card>
          <h3 className="mb-3 font-bold">درخواست‌های تلاش مجدد</h3>
          <div className="grid gap-2">
            {retries.data.map((request) => (
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
                    onClick={() =>
                      void modal.confirm({ title: "تأیید تلاش مجدد؟" }).then(
                        (ok) =>
                          ok &&
                          review.mutate({
                            id: request.id,
                            status: "approved",
                          }),
                      )
                    }
                  >
                    <Check size={15} />
                    تأیید
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      void modal
                        .confirm({ title: "رد درخواست؟", tone: "danger" })
                        .then(
                          (ok) =>
                            ok &&
                            review.mutate({
                              id: request.id,
                              status: "rejected",
                            }),
                        )
                    }
                  >
                    <X size={15} />
                    رد
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      <Card>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
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
          <Button
            variant="soft"
            disabled={!students.studentId}
            onClick={() =>
              void downloadJson(
                `/admin/export/json?studentId=${encodeURIComponent(students.studentId)}&scope=exams`,
                `moshaver-exams-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            <Download size={16} />
            خروجی
          </Button>
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
        <div className="mb-3 flex items-center gap-2">
          <FileJson size={18} />
          <div>
            <h3 className="font-bold">ورود و خروج کامل آزمون‌ها</h3>
            <p className="text-xs text-slate-500">
              schema-v2 شامل بودجه‌بندی، سؤال‌ها، پاسخ‌ها، زمان‌بندی و تعداد
              تلاش‌ها
            </p>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)]">
          <Field label="فایل یا متن JSON آزمون">
            <input
              type="file"
              accept="application/json,.json"
              className="text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(setJson);
              }}
            />
            <Textarea
              rows={9}
              dir="ltr"
              value={json}
              onChange={(event) => {
                setJson(event.target.value);
                previewImport.reset();
              }}
              placeholder='{"schemaVersion":2,"exams":[...]}'
            />
          </Field>
          <div className="grid content-start gap-3">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
              />{" "}
              جایگزینی آزمون همنام در همان تاریخ
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="soft"
                loading={previewImport.isPending}
                disabled={!json || !students.studentId}
                onClick={() => parseJson((data) => previewImport.mutate(data))}
              >
                اعتبارسنجی
              </Button>
              <Button
                loading={commitImport.isPending}
                disabled={
                  !previewImport.data || !!previewImport.data.errors?.length
                }
                onClick={() =>
                  parseJson((data) =>
                    commitImport.mutate({ data, publishImported: false }),
                  )
                }
              >
                ثبت پیش‌نویس
              </Button>
              <Button
                loading={commitImport.isPending}
                disabled={
                  !previewImport.data || !!previewImport.data.errors?.length
                }
                onClick={() =>
                  parseJson((data) =>
                    commitImport.mutate({ data, publishImported: true }),
                  )
                }
              >
                ثبت و انتشار
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={!students.studentId}
                onClick={() =>
                  void downloadJson(
                    `/admin/import/template?studentId=${encodeURIComponent(students.studentId)}&scope=exams`,
                    "moshaver-exams-template.json",
                  )
                }
              >
                قالب آزمون
              </Button>
              <Button
                variant="ghost"
                disabled={!students.studentId}
                onClick={() =>
                  void downloadJson(
                    `/admin/export/json?studentId=${encodeURIComponent(students.studentId)}&scope=exams`,
                    "moshaver-exams-full.json",
                  )
                }
              >
                خروجی کامل
              </Button>
            </div>
            {previewImport.data ? (
              <ImportPreviewView preview={previewImport.data} />
            ) : null}
          </div>
        </div>
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
        {filtered.length ? (
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
                  save.mutate({
                    id: exam.id,
                    body: { ...examDraft(exam), published: !exam.published },
                  })
                }
                onAddSyllabus={() =>
                  modal.open({
                    title: "افزودن بودجه‌بندی",
                    description: exam.title,
                    content: (
                      <SyllabusForm
                        onCancel={modal.close}
                        onSubmit={(data) =>
                          void addSyllabus
                            .mutateAsync({ examId: exam.id, data })
                            .then(modal.close)
                        }
                      />
                    ),
                  })
                }
                onDeleteSyllabus={(id) =>
                  void modal
                    .confirm({ title: "حذف بودجه‌بندی؟", tone: "danger" })
                    .then((ok) => ok && deleteSyllabus.mutate(id))
                }
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
  onAddSyllabus,
  onDeleteSyllabus,
}: {
  exam: Exam;
  checked: boolean;
  onCheck: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onAddSyllabus: () => void;
  onDeleteSyllabus: (id: string) => void;
}) {
  const { formatDate, formatDateTime } = useLocale();
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
        <Badge tone={exam.published ? "green" : "amber"}>
          {exam.published ? "منتشر" : "پیش‌نویس"}
        </Badge>
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
        <Link to={`/admin/questions?examId=${encodeURIComponent(exam.id)}`}>
          <Button className="h-8 px-2 text-xs" variant="soft">
            سؤال‌ها
          </Button>
        </Link>
        <Button className="h-8 px-2 text-xs" variant="ghost" onClick={onToggle}>
          {exam.published ? "پیش‌نویس" : "انتشار"}
        </Button>
        <Button className="h-8 px-2" variant="danger" onClick={onDelete}>
          <Trash2 size={14} />
        </Button>
      </div>
      <div className="mt-3 border-t pt-3">
        <div className="mb-2 flex justify-between">
          <strong className="text-xs">بودجه‌بندی</strong>
          <button className="text-xs text-brand" onClick={onAddSyllabus}>
            + افزودن
          </button>
        </div>
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
      </div>
    </article>
  );
}
function ExamForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: ExamDraft;
  busy: boolean;
  onSubmit: (data: ExamDraft) => void;
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
            onChange={(isoDate) => setData({ ...data, isoDate })}
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" onClick={onCancel}>
          انصراف
        </Button>
        <Button loading={busy}>ذخیره آزمون</Button>
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
  onSubmit: (data: SyllabusDraft) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<SyllabusDraft>({
    subject: "",
    description: "",
    track: "",
    required: true,
  });
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
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
        <Button>افزودن</Button>
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
function examDraft(exam?: Exam): ExamDraft {
  const day = exam?.isoDate || new Date().toISOString().slice(0, 10);
  return {
    title: exam?.title || "",
    persianDate: exam?.persianDate || "",
    isoDate: day,
    openAt: exam?.openAt || `${day}T08:00:00+03:30`,
    closeAt: exam?.closeAt || `${day}T13:00:00+03:30`,
    durationMinutes: exam?.durationMinutes || 120,
    maxAttempts: exam?.maxAttempts || 1,
    status: exam?.status || "upcoming",
    published: exam?.published ?? false,
    note: exam?.note || "",
    instructions: exam?.instructions || "",
  };
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
function ImportPreviewView({ preview }: { preview: ImportPreview }) {
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="آزمون" value={preview.summary?.exams || 0} />
        <Metric label="سؤال" value={preview.summary?.questions || 0} />
        <Metric label="تداخل" value={preview.summary?.conflicts || 0} />
      </div>
      {preview.errors?.length ? (
        <MessageList
          title="خطاها"
          items={preview.errors}
          tone="text-rose-700"
        />
      ) : (
        <p className="font-semibold text-emerald-700">فایل آماده ثبت است.</p>
      )}
      {preview.warnings?.length ? (
        <MessageList
          title="هشدارها"
          items={preview.warnings}
          tone="text-amber-700"
        />
      ) : null}
      {preview.conflicts?.length ? (
        <MessageList
          title="تداخل‌ها"
          items={preview.conflicts}
          tone="text-amber-700"
        />
      ) : null}
    </div>
  );
}
function MessageList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className={tone}>
      <strong>{title}</strong>
      <ul className="mt-1 list-inside list-disc leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
async function downloadJson(path: string, filename: string) {
  const data = await api.get<unknown>(path);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
