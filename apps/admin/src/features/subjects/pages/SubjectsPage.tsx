import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  BookPlus,
  Edit3,
  RotateCcw,
  Save,
  Search,
  Download,
  Users,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStudentSelection } from "../../../shared/hooks/useStudentSelection";
import { useAuth } from "../../auth/hooks/useAuth";
import { fa, normalizePersianText } from "../../../shared/lib/utils";
import { useModal } from "../../../shared/ui/modal";
import { notify } from "../../../shared/ui/notifications";
import { StudentPicker } from "../../../shared/ui/StudentPicker";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "../../../shared/ui/ui";
import {
  createSubject,
  getStudentSubjects,
  getSubjects,
  getEducationBooks,
  getEducationDatasets,
  setSubjectActive,
  updateStudentSubject,
  updateSubject,
} from "../api/subjects.api";
import type {
  EducationBook,
  StudentSubject,
  Subject,
  SubjectsMode as Mode,
} from "../model/subject.types";
import { TeacherAssignments } from "../components/TeacherAssignments";

export function SubjectsPage() {
  const auth = useAuth();
  const canReadStudentSubjects = auth.can("studentSubjects.read") && auth.can("students.read");
  const students = useStudentSelection({ enabled: canReadStudentSubjects }),
    qc = useQueryClient(),
    modal = useModal(),
    [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
      params.get("mode") === "books"
        ? "books"
        : params.get("mode") !== "catalog" && canReadStudentSubjects
          ? "student"
          : "catalog",
    ),
    [search, setSearch] = useState(params.get("q") || "");
  const deferredSearch = useDeferredValue(search);
  const canCreate = auth.can("subjects.create");
  const canUpdate = auth.can("subjects.update");
  const canArchive = auth.can("subjects.archive");
  const canManageStudentSubjects = auth.can("studentSubjects.manage");
  const subjects = useQuery({
    queryKey: ["subjects", { includeArchived: canArchive }],
    queryFn: () => getSubjects(canArchive),
  });
  const books = useQuery({
    queryKey: ["education-books"],
    enabled: mode === "books",
    queryFn: getEducationBooks,
  });
  const assigned = useQuery({
    queryKey: ["student-subjects", students.studentId],
    enabled: canReadStudentSubjects && !!students.studentId && mode === "student",
    queryFn: () => getStudentSubjects(students.studentId),
  });
  const create = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      notify("درس جدید ساخته شد.");
      void refreshAll();
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "ساخت درس ناموفق بود.", "error"),
  });
  const updateCatalog = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateSubject(id, { name }),
    onSuccess: () => {
      notify("مشخصات درس به‌روز شد.");
      void refreshAll();
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "ویرایش درس ناموفق بود.", "error"),
  });
  const archiveCatalog = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setSubjectActive(id, active),
    onSuccess: (_, variables) => {
      notify(variables.active ? "درس دوباره فعال شد." : "درس بایگانی شد.");
      void refreshAll();
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "تغییر وضعیت درس ناموفق بود.", "error"),
  });
  const updateStudent = useMutation({
    mutationFn: (setting: StudentSubject) => updateStudentSubject(students.studentId, setting),
    onSuccess: () => {
      notify("وضعیت آموزشی دانش‌آموز ذخیره شد.");
      void qc.invalidateQueries({
        queryKey: ["student-subjects", students.studentId],
      });
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "ذخیره وضعیت درس ناموفق بود.", "error"),
  });
  const catalogRows = useMemo(
    () =>
      (subjects.data || []).filter((row) =>
        normalizePersianText(`${row.name} ${row.code}`).includes(
          normalizePersianText(deferredSearch),
        ),
      ),
    [deferredSearch, subjects.data],
  );
  const studentRows = useMemo(
    () =>
      (assigned.data || []).filter((row) =>
        normalizePersianText(`${row.subject.name} ${row.subject.code} ${row.displayName}`).includes(
          normalizePersianText(deferredSearch),
        ),
      ),
    [assigned.data, deferredSearch],
  );
  const bookRows = useMemo(
    () =>
      (books.data || []).filter((row) =>
        normalizePersianText(
          `${row.titleFa} ${row.titleEn} ${row.category} ${row.track} ${row.grade}`,
        ).includes(normalizePersianText(deferredSearch)),
      ),
    [books.data, deferredSearch],
  );
  const rows = mode === "catalog" ? catalogRows : mode === "books" ? bookRows : studentRows;
  const summary = {
    total: assigned.data?.length || 0,
    enabled: (assigned.data || []).filter((row) => row.enabled).length,
    disabled: (assigned.data || []).filter((row) => !row.enabled).length,
    average: assigned.data?.length
      ? Math.round(
          assigned.data.reduce((sum, row) => sum + row.weeklyTargetMinutes, 0) /
            assigned.data.length,
        )
      : 0,
  };
  function updateUrl(next: { mode?: Mode; q?: string; studentId?: string }) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current),
          nextMode = next.mode ?? mode,
          nextQuery = next.q ?? search,
          nextStudent = next.studentId ?? students.studentId;
        nextMode === "student" ? copy.delete("mode") : copy.set("mode", nextMode);
        nextQuery.trim() ? copy.set("q", nextQuery.trim()) : copy.delete("q");
        if (nextStudent) copy.set("studentId", nextStudent);
        return copy;
      },
      { replace: true },
    );
  }
  async function refreshAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["subjects"] }),
      qc.invalidateQueries({ queryKey: ["student-subjects"] }),
    ]);
  }
  function openCreate() {
    modal.open({
      title: "درس جدید",
      description: "درس برای همه دانش‌آموزان به فهرست آموزشی اضافه می‌شود.",
      content: (
        <CatalogForm
          onSubmit={async (value) => {
            await create.mutateAsync(value);
            modal.close();
          }}
        />
      ),
    });
  }
  function openCatalogEdit(subject: Subject) {
    modal.open({
      title: "ویرایش درس",
      description: subject.code,
      content: (
        <CatalogForm
          initial={subject}
          onSubmit={async (value) => {
            await updateCatalog.mutateAsync({ id: subject.id, name: value.name });
            modal.close();
          }}
        />
      ),
    });
  }
  function openTeacherAssignments(subject: Subject) {
    const organization = auth.context?.activeOrganization;
    if (!organization) return;
    modal.open({
      title: `دبیران ${subject.name}`,
      description: `تخصیص دبیر در ${organization.name}`,
      content: <TeacherAssignments subjectId={subject.id} organizationId={organization.id} />,
    });
  }
  const activeQuery = mode === "catalog" ? subjects : mode === "books" ? books : assigned;
  async function downloadDatasets() {
    const data = await getEducationDatasets();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "iran-education-catalog-1405-1406.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="grid gap-4">
      <Card className="sticky top-16 z-10 p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md bg-slate-100 p-1">
            {canReadStudentSubjects ? (
              <button
                className={`rounded px-3 py-2 text-xs font-bold ${mode === "student" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
                onClick={() => {
                  setMode("student");
                  updateUrl({ mode: "student" });
                }}
              >
                وضعیت دانش‌آموز
              </button>
            ) : null}
            <button
              className={`rounded px-3 py-2 text-xs font-bold ${mode === "catalog" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
              onClick={() => {
                setMode("catalog");
                updateUrl({ mode: "catalog" });
              }}
            >
              فهرست سراسری
            </button>
            <button
              className={`rounded px-3 py-2 text-xs font-bold ${mode === "books" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
              onClick={() => {
                setMode("books");
                updateUrl({ mode: "books" });
              }}
            >
              کتاب‌های ۱۴۰۵–۱۴۰۶
            </button>
          </div>
          {mode === "student" ? (
            <div className="min-w-56 flex-1 md:max-w-xs">
              <StudentPicker
                students={students.students}
                value={students.studentId}
                onChange={students.selectStudent}
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {mode === "catalog" && canCreate ? (
            <Button onClick={openCreate}>
              <BookPlus size={16} /> درس جدید
            </Button>
          ) : null}
          {mode === "books" ? (
            <Button variant="soft" onClick={() => void downloadDatasets()}>
              <Download size={16} /> دریافت JSON اصلی
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3">
            <Search size={16} className="text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                updateUrl({ q: event.target.value });
              }}
              placeholder="جستجوی نام، کلید یا یادداشت درس"
            />
          </label>
          {search ? (
            <Button
              className="h-9 px-2"
              variant="ghost"
              onClick={() => {
                setSearch("");
                updateUrl({ q: "" });
              }}
            >
              <RotateCcw size={15} /> پاک‌کردن
            </Button>
          ) : null}
          <Badge tone="blue">{rows.length.toLocaleString("fa-IR")} نتیجه</Badge>
        </div>
      </Card>
      {mode === "student" ? (
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="همه درس‌ها" value={summary.total} />
          <Metric label="فعال" value={summary.enabled} tone="green" />
          <Metric label="غیرفعال" value={summary.disabled} tone="red" />
          <Metric label="میانگین هدف هفتگی" value={`${fa(summary.average)} دقیقه`} />
        </section>
      ) : null}
      <Card>
        {activeQuery.isLoading ? (
          <Skeleton />
        ) : activeQuery.isError ? (
          <EmptyState
            title="دریافت اطلاعات درس‌ها ناموفق بود."
            action={
              <Button variant="soft" onClick={() => void activeQuery.refetch()}>
                تلاش دوباره
              </Button>
            }
          />
        ) : rows.length ? (
          <div className="grid gap-3">
            {mode === "catalog"
              ? catalogRows.map((row) => (
                  <CatalogRow
                    key={row.id}
                    subject={row}
                    onEdit={canUpdate ? () => openCatalogEdit(row) : undefined}
                    onToggleActive={
                      canArchive
                        ? () => archiveCatalog.mutate({ id: row.id, active: !row.active })
                        : undefined
                    }
                    toggling={archiveCatalog.isPending && archiveCatalog.variables?.id === row.id}
                    onTeachers={
                      auth.can("organization.members.manage") && auth.context?.activeOrganization
                        ? () => openTeacherAssignments(row)
                        : undefined
                    }
                  />
                ))
              : mode === "books"
                ? bookRows.map((row) => <EducationBookRow key={row.id} book={row} />)
                : studentRows.map((row) => (
                    <StudentSubjectEditor
                      key={`${students.studentId}-${row.subject.id}`}
                      initial={row}
                      onSave={(value) => updateStudent.mutate(value)}
                      saving={
                        updateStudent.isPending &&
                        updateStudent.variables?.subject.id === row.subject.id
                      }
                      editable={canManageStudentSubjects}
                    />
                  ))}
          </div>
        ) : (
          <EmptyState title={search ? "درسی با این جستجو پیدا نشد." : "درسی ثبت نشده است."} />
        )}
      </Card>
    </div>
  );
}

function EducationBookRow({ book }: { book: EducationBook }) {
  return (
    <article className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <span className="grid size-10 place-items-center rounded-full bg-amber-50 text-amber-700">
        <BookOpen size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <strong>{book.titleFa}</strong>
        <p className="text-xs text-slate-500">
          {book.category} · {book.level} · {book.track}
        </p>
      </div>
      <Badge tone="blue">پایه {fa(book.grade)}</Badge>
      {book.textbookCode ? <Badge tone="neutral">{book.textbookCode}</Badge> : null}
    </article>
  );
}

function CatalogRow({
  subject,
  onEdit,
  onTeachers,
  onToggleActive,
  toggling,
}: {
  subject: Subject;
  onEdit?: () => void;
  onTeachers?: () => void;
  onToggleActive?: () => void;
  toggling: boolean;
}) {
  return (
    <article className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <span className="grid size-10 place-items-center rounded-full bg-indigo-50 text-brand">
        <BookOpen size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <strong className={subject.active ? "" : "text-slate-500"}>{subject.name}</strong>
        <p className="truncate text-xs text-slate-500" dir="ltr">
          {subject.code}
        </p>
      </div>
      <Badge tone={subject.active ? "green" : "neutral"}>
        {subject.active ? "فعال" : "بایگانی‌شده"}
      </Badge>
      {onEdit ? (
        <Button variant="soft" onClick={onEdit}>
          <Edit3 size={15} /> ویرایش
        </Button>
      ) : null}
      {onTeachers ? (
        <Button variant="soft" onClick={onTeachers}>
          <Users size={15} />
          دبیران
        </Button>
      ) : null}
      {onToggleActive ? (
        <Button variant="ghost" loading={toggling} onClick={onToggleActive}>
          {subject.active ? <Archive size={15} /> : <ArchiveRestore size={15} />}
          {subject.active ? "بایگانی" : "فعال‌سازی"}
        </Button>
      ) : null}
    </article>
  );
}
function StudentSubjectEditor({
  initial,
  onSave,
  saving,
  editable,
}: {
  initial: StudentSubject;
  onSave: (subject: StudentSubject) => void;
  saving: boolean;
  editable: boolean;
}) {
  const [setting, setSetting] = useState(initial);
  useEffect(() => setSetting(initial), [initial]);
  const dirty = JSON.stringify(setting) !== JSON.stringify(initial);
  return (
    <article className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.1fr_140px_1fr_180px_auto] lg:items-end">
      <div>
        <strong>{setting.subject.name}</strong>
        <p className="text-xs text-slate-500" dir="ltr">
          {setting.subject.code}
        </p>
      </div>
      <Field label="نمایش برای دانش‌آموز">
        <Select
          disabled={!editable}
          value={setting.enabled ? "enabled" : "disabled"}
          onChange={(event) =>
            setSetting({ ...setting, enabled: event.target.value === "enabled" })
          }
        >
          <option value="enabled">فعال</option>
          <option value="disabled">غیرفعال</option>
        </Select>
      </Field>
      <Field label="نام نمایشی">
        <Input
          disabled={!editable}
          maxLength={120}
          value={setting.displayName}
          onChange={(event) => setSetting({ ...setting, displayName: event.target.value })}
          placeholder={setting.subject.name}
        />
      </Field>
      <Field label="هدف هفتگی (دقیقه)">
        <Input
          disabled={!editable}
          type="number"
          min={0}
          value={setting.weeklyTargetMinutes}
          onChange={(event) =>
            setSetting({ ...setting, weeklyTargetMinutes: Number(event.target.value) })
          }
        />
      </Field>
      {editable ? (
        <Button
          loading={saving}
          variant={dirty ? "primary" : "soft"}
          disabled={!dirty || saving}
          onClick={() => onSave(setting)}
        >
          <Save size={15} /> ذخیره
        </Button>
      ) : null}
    </article>
  );
}
function CatalogForm({
  initial,
  onSubmit,
}: {
  initial?: Subject;
  onSubmit: (value: { name: string; code: string }) => Promise<void>;
}) {
  const [value, setValue] = useState({
      name: initial?.name || "",
      code: initial?.code || "",
    }),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void onSubmit(value).finally(() => setBusy(false));
      }}
    >
      <Field label="نام درس">
        <Input
          autoFocus
          maxLength={150}
          value={value.name}
          onChange={(event) => setValue({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="کلید یکتا">
        <Input
          dir="ltr"
          maxLength={80}
          disabled={!!initial}
          value={value.code}
          onChange={(event) =>
            setValue({
              ...value,
              code: event.target.value.trim().replace(/\s+/g, "-"),
            })
          }
          placeholder="mathematics"
        />
      </Field>
      {initial ? (
        <p className="text-xs text-slate-500">
          برای حفظ ارتباط داده‌ها، کلید یکتا پس از ساخت تغییر نمی‌کند.
        </p>
      ) : null}
      <Button
        type="submit"
        loading={busy}
        disabled={busy || value.name.trim().length < 2 || !value.code.trim()}
      >
        {initial ? "ذخیره تغییرات" : "ساخت درس"}
      </Button>
    </form>
  );
}
function Metric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "green" | "red";
}) {
  return (
    <Card className="p-3">
      <span className="text-xs text-slate-500">{label}</span>
      <strong
        className={`mt-1 block text-xl ${tone === "green" ? "text-emerald-700" : tone === "red" ? "text-rose-700" : "text-slate-800"}`}
      >
        {typeof value === "number" ? fa(value) : value}
      </strong>
    </Card>
  );
}
function Skeleton() {
  return (
    <div className="grid gap-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}
